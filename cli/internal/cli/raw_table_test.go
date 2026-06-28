package cli

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// rawRecording captures the single request a raw command emits so a table case
// can assert method + path + query + body wiring against the served response.
type rawRecording struct {
	called      bool
	method      string
	escapedPath string
	query       map[string][]string
	body        map[string]any
}

// rawRecorder returns an httptest server that records the first request and
// replies with a fixed JSON document so the CLI prints a decodable result.
func rawRecorder(t *testing.T) (*httptest.Server, *rawRecording) {
	t.Helper()
	rec := &rawRecording{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec.called = true
		rec.method = r.Method
		rec.escapedPath = r.URL.EscapedPath()
		rec.query = map[string][]string(r.URL.Query())
		if r.Body != nil {
			if raw, err := readAllBody(r); err == nil && len(raw) > 0 {
				_ = json.Unmarshal(raw, &rec.body)
			}
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":1,"title":"demo","ok":true,"data":[],"hasMore":false}`))
	}))
	return server, rec
}

func readAllBody(r *http.Request) ([]byte, error) {
	var buf bytes.Buffer
	if _, err := buf.ReadFrom(r.Body); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// rawCase is one row of the raw-surface wiring table.
type rawCase struct {
	name string
	// args are appended after "raw" (the subcommand and its flags).
	args []string
	// stdin, when set, is fed to the command (used for --body @-).
	stdin string

	wantMethod string
	wantPath   string            // expected r.URL.EscapedPath()
	wantQuery  map[string]string // expected single-valued decoded query params
	wantBody   map[string]any    // expected decoded JSON request body (writes)
	checkJSON  bool              // assert stdout is indented JSON echoing the response
	wantErr    string            // when set, Execute must fail with this substring
	wantNoCall bool              // when set, the API must not be reached
}

func TestRawCommandsTableDriven(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	cases := []rawCase{
		// ---- reads / lists: method, path, query wiring ----
		{
			name:       "list-spaces with pagination and expand",
			args:       []string{"list-spaces", "--page", "1", "--page-size", "2", "--expand", "board"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/spaces",
			wantQuery:  map[string]string{"page": "1", "pageSize": "2", "expand": "board"},
			checkJSON:  true,
		},
		{
			name:       "list-teams pagination",
			args:       []string{"list-teams", "--page", "3", "--page-size", "4"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/teams",
			wantQuery:  map[string]string{"page": "3", "pageSize": "4"},
		},
		{
			name:       "list-users pagination",
			args:       []string{"list-users"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/users",
		},
		{
			name:       "list-boards path param",
			args:       []string{"list-boards", "--space-id", "7"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/spaces/7/boards",
		},
		{
			name:       "list-items path params plus expand",
			args:       []string{"list-items", "--space-id", "1", "--board-id", "2", "--page", "5", "--expand", "space,board"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/spaces/1/boards/2/items",
			wantQuery:  map[string]string{"page": "5", "expand": "space,board"},
		},
		{
			name:       "get-space single param plus expand",
			args:       []string{"get-space", "--space-id", "9", "--expand", "board"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/spaces/9",
			wantQuery:  map[string]string{"expand": "board"},
			checkJSON:  true,
		},
		{
			name:       "get-team single param",
			args:       []string{"get-team", "--team-id", "42"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/teams/42",
		},
		{
			name:       "get-current-user no params",
			args:       []string{"get-current-user"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/users/me",
		},
		{
			name:       "get-board nested params",
			args:       []string{"get-board", "--space-id", "1", "--board-id", "2"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/spaces/1/boards/2",
		},
		{
			name:       "get-item nested params plus expand",
			args:       []string{"get-item", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--expand", "fields"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/spaces/1/boards/2/items/3",
			wantQuery:  map[string]string{"expand": "fields"},
		},
		{
			name:       "list-subitems deep path",
			args:       []string{"list-subitems", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--page", "2"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/spaces/1/boards/2/items/3/sub-items",
			wantQuery:  map[string]string{"page": "2"},
		},
		{
			name:       "list-item-comments deep path",
			args:       []string{"list-item-comments", "--space-id", "1", "--board-id", "2", "--item-id", "3"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/spaces/1/boards/2/items/3/comments",
		},

		// ---- writes: method, path, JSON body wiring ----
		{
			name:       "create-item inline body",
			args:       []string{"create-item", "--space-id", "1", "--board-id", "2", "--body", `{"title":"From raw"}`},
			wantMethod: http.MethodPost,
			wantPath:   "/v1/public/spaces/1/boards/2/items",
			wantBody:   map[string]any{"title": "From raw"},
		},
		{
			name:       "update-item-field PATCH with field key in path",
			args:       []string{"update-item-field", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-field-key", "status-1", "--body", `{"value":"Done"}`},
			wantMethod: http.MethodPatch,
			wantPath:   "/v1/public/spaces/1/boards/2/items/3/fields/status-1",
			wantBody:   map[string]any{"value": "Done"},
		},
		{
			name:       "update-item-fields PATCH",
			args:       []string{"update-item-fields", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--body", `{"string-1":"hi"}`},
			wantMethod: http.MethodPatch,
			wantPath:   "/v1/public/spaces/1/boards/2/items/3/fields",
			wantBody:   map[string]any{"string-1": "hi"},
		},
		{
			name:       "create-item-comment POST",
			args:       []string{"create-item-comment", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--body", `{"text":"hello"}`},
			wantMethod: http.MethodPost,
			wantPath:   "/v1/public/spaces/1/boards/2/items/3/comments",
			wantBody:   map[string]any{"text": "hello"},
		},
		{
			name:       "update-item-comment PUT",
			args:       []string{"update-item-comment", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-comment-id", "5", "--body", `{"text":"edit"}`},
			wantMethod: http.MethodPut,
			wantPath:   "/v1/public/spaces/1/boards/2/items/3/comments/5",
			wantBody:   map[string]any{"text": "edit"},
		},
		{
			name:       "replace-comment-reactions PUT spec body shape",
			args:       []string{"replace-comment-reactions", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-comment-id", "5", "--body", `{"reactions":[{"value":"1f44d"}]}`},
			wantMethod: http.MethodPut,
			wantPath:   "/v1/public/spaces/1/boards/2/items/3/comments/5/reactions",
			wantBody:   map[string]any{"reactions": []any{map[string]any{"value": "1f44d"}}},
		},

		// ---- deletes: --confirm gate satisfied ----
		{
			name:       "delete-item with confirm",
			args:       []string{"delete-item", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--confirm"},
			wantMethod: http.MethodDelete,
			wantPath:   "/v1/public/spaces/1/boards/2/items/3",
		},
		{
			name:       "delete-item-comment with confirm",
			args:       []string{"delete-item-comment", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-comment-id", "5", "--confirm"},
			wantMethod: http.MethodDelete,
			wantPath:   "/v1/public/spaces/1/boards/2/items/3/comments/5",
		},

		// ---- path-segment escaping ----
		{
			name:       "get-space escapes slash and space",
			args:       []string{"get-space", "--space-id", "a/b c"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/spaces/a%2Fb%20c",
		},
		{
			name:       "get-item escapes every path segment",
			args:       []string{"get-item", "--space-id", "s p", "--board-id", "b/d", "--item-id", "i?q"},
			wantMethod: http.MethodGet,
			wantPath:   "/v1/public/spaces/s%20p/boards/b%2Fd/items/i%3Fq",
		},

		// ---- required-input gates: API must not be reached ----
		{
			name:       "create-item missing body",
			args:       []string{"create-item", "--space-id", "1", "--board-id", "2"},
			wantErr:    "--body is required",
			wantNoCall: true,
		},
		{
			name:       "update-item-field missing body",
			args:       []string{"update-item-field", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-field-key", "status-1"},
			wantErr:    "--body is required",
			wantNoCall: true,
		},
		{
			name:       "replace-comment-reactions missing body",
			args:       []string{"replace-comment-reactions", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-comment-id", "5"},
			wantErr:    "--body is required",
			wantNoCall: true,
		},
		{
			name:       "delete-item missing confirm",
			args:       []string{"delete-item", "--space-id", "1", "--board-id", "2", "--item-id", "3"},
			wantErr:    "--confirm is required",
			wantNoCall: true,
		},
		{
			name:       "delete-item-comment missing confirm",
			args:       []string{"delete-item-comment", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-comment-id", "5"},
			wantErr:    "--confirm is required",
			wantNoCall: true,
		},
		{
			name:       "create-item missing required path param",
			args:       []string{"create-item", "--board-id", "2", "--body", `{"title":"x"}`},
			wantErr:    "--space-id is required",
			wantNoCall: true,
		},
		{
			name:       "get-space missing required path param",
			args:       []string{"get-space"},
			wantErr:    "--space-id is required",
			wantNoCall: true,
		},
		{
			name:       "create-item rejects invalid JSON body",
			args:       []string{"create-item", "--space-id", "1", "--board-id", "2", "--body", `{not json}`},
			wantErr:    "invalid --body JSON",
			wantNoCall: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			server, rec := rawRecorder(t)
			defer server.Close()

			args := append([]string{"--api-key", "from-flag", "--server-url", server.URL, "raw"}, tc.args...)
			var input *bytes.Buffer
			if tc.stdin != "" {
				input = bytes.NewBufferString(tc.stdin)
			}
			out, err := executeRootWithInput(t, input, args...)

			if tc.wantErr != "" {
				if err == nil {
					t.Fatalf("expected error, got nil; output:\n%s", out)
				}
				if !strings.Contains(err.Error(), tc.wantErr) {
					t.Fatalf("error = %q, want substring %q", err.Error(), tc.wantErr)
				}
				if tc.wantNoCall && rec.called {
					t.Fatalf("API was reached for a case that must short-circuit")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v\noutput:\n%s", err, out)
			}
			if !rec.called {
				t.Fatal("API was not reached")
			}
			if rec.method != tc.wantMethod {
				t.Fatalf("method = %s, want %s", rec.method, tc.wantMethod)
			}
			if rec.escapedPath != tc.wantPath {
				t.Fatalf("path = %s, want %s", rec.escapedPath, tc.wantPath)
			}
			for key, want := range tc.wantQuery {
				got := rec.query[key]
				if len(got) != 1 || got[0] != want {
					t.Fatalf("query[%q] = %v, want [%q]", key, got, want)
				}
			}
			// Query keys not listed in wantQuery must be absent (covers the
			// "no stray params" expectation, e.g. expand only when requested).
			allowed := map[string]bool{}
			for key := range tc.wantQuery {
				allowed[key] = true
			}
			for key := range rec.query {
				if !allowed[key] {
					t.Fatalf("unexpected query param %q=%v", key, rec.query[key])
				}
			}
			if tc.wantBody != nil {
				if !jsonEqual(rec.body, tc.wantBody) {
					t.Fatalf("body = %#v, want %#v", rec.body, tc.wantBody)
				}
			}
			if tc.checkJSON {
				var decoded map[string]any
				if jerr := json.Unmarshal([]byte(out), &decoded); jerr != nil {
					t.Fatalf("stdout is not valid JSON: %v\n%s", jerr, out)
				}
				if decoded["ok"] != true {
					t.Fatalf("stdout JSON missing echoed response field: %s", out)
				}
				if !strings.Contains(out, "\n  ") {
					t.Fatalf("stdout JSON is not indented:\n%s", out)
				}
			}
		})
	}
}

// TestRawCreateItemBodySources exercises the three --body sources that the table
// cannot express inline: a @file path, @- stdin, and a missing file error.
func TestRawCreateItemBodySources(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	t.Run("@file", func(t *testing.T) {
		server, rec := rawRecorder(t)
		defer server.Close()
		path := t.TempDir() + "/payload.json"
		if err := os.WriteFile(path, []byte(`{"title":"From file"}`), 0o600); err != nil {
			t.Fatalf("write payload: %v", err)
		}
		_, err := executeRoot(t, "--api-key", "from-flag", "--server-url", server.URL,
			"raw", "create-item", "--space-id", "1", "--board-id", "2", "--body", "@"+path)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.body["title"] != "From file" {
			t.Fatalf("body = %#v", rec.body)
		}
	})

	t.Run("@- stdin", func(t *testing.T) {
		server, rec := rawRecorder(t)
		defer server.Close()
		_, err := executeRootWithInput(t, bytes.NewBufferString(`{"title":"From stdin"}`),
			"--api-key", "from-flag", "--server-url", server.URL,
			"raw", "create-item", "--space-id", "1", "--board-id", "2", "--body", "@-")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.body["title"] != "From stdin" {
			t.Fatalf("body = %#v", rec.body)
		}
	})

	t.Run("@missing-file errors before calling API", func(t *testing.T) {
		server, rec := rawRecorder(t)
		defer server.Close()
		missing := t.TempDir() + "/does-not-exist.json"
		_, err := executeRoot(t, "--api-key", "from-flag", "--server-url", server.URL,
			"raw", "create-item", "--space-id", "1", "--board-id", "2", "--body", "@"+missing)
		if err == nil {
			t.Fatal("expected error for missing body file")
		}
		if !strings.Contains(err.Error(), "read --body file") {
			t.Fatalf("error = %v", err)
		}
		if rec.called {
			t.Fatal("API reached despite unreadable body file")
		}
	})
}

// jsonEqual compares two decoded JSON values by re-marshaling, which normalizes
// map ordering and numeric representation.
func jsonEqual(a, b any) bool {
	ab, err := json.Marshal(a)
	if err != nil {
		return false
	}
	bb, err := json.Marshal(b)
	if err != nil {
		return false
	}
	return bytes.Equal(ab, bb)
}
