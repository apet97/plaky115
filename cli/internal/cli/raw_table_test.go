package cli

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"unicode"
)

// rawRecording captures the single request a raw command emits so a table case
// can assert method + path + query + body wiring against the served response.
type rawRecording struct {
	called      bool
	method      string
	escapedPath string
	query       map[string][]string
	body        map[string]any
	rawBody     []byte
	contentType string
	idempotency string
	apiKey      string
	multipart   *rawMultipart
	err         error
}

type rawMultipart struct {
	fieldName   string
	fileName    string
	contentType string
	bytes       []byte
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
		rec.contentType = r.Header.Get("Content-Type")
		rec.idempotency = r.Header.Get("Idempotency-Key")
		rec.apiKey = r.Header.Get("X-API-Key")
		if r.Body != nil {
			if raw, err := readAllBody(r); err == nil && len(raw) > 0 {
				rec.rawBody = raw
				mediaType, params, parseErr := mime.ParseMediaType(rec.contentType)
				if parseErr == nil && mediaType == "multipart/form-data" {
					rec.multipart, rec.err = parseMultipart(raw, params["boundary"])
				} else {
					rec.err = json.Unmarshal(raw, &rec.body)
				}
			} else if err != nil {
				rec.err = err
			}
		}
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == http.MethodDelete || strings.HasSuffix(r.URL.Path, "/archive"):
			w.WriteHeader(http.StatusOK)
		case r.Method == http.MethodGet && (strings.HasSuffix(r.URL.Path, "/comments") || strings.HasSuffix(r.URL.Path, "/files")):
			_, _ = w.Write([]byte(`[{"id":1}]`))
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/download"):
			_, _ = w.Write([]byte(`{"url":"https://download.example.test/file?signature=one","expiresInSeconds":60}`))
		default:
			_, _ = w.Write([]byte(`{"id":1,"title":"demo","ok":true,"data":[],"hasMore":false}`))
		}
	}))
	return server, rec
}

func parseMultipart(raw []byte, boundary string) (*rawMultipart, error) {
	if boundary == "" {
		return nil, fmt.Errorf("multipart boundary is missing")
	}
	reader := multipart.NewReader(bytes.NewReader(raw), boundary)
	part, err := reader.NextPart()
	if err != nil {
		return nil, err
	}
	contents, err := io.ReadAll(part)
	if err != nil {
		return nil, err
	}
	if extra, err := reader.NextPart(); err != io.EOF || extra != nil {
		return nil, fmt.Errorf("multipart request must contain exactly one part")
	}
	return &rawMultipart{
		fieldName:   part.FormName(),
		fileName:    part.FileName(),
		contentType: part.Header.Get("Content-Type"),
		bytes:       contents,
	}, nil
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
	name        string
	operationID string
	// args are appended after "raw" (the subcommand and its flags).
	args []string
	// stdin, when set, is fed to the command (used for --body @-).
	stdin string

	wantMethod      string
	wantPath        string              // expected r.URL.EscapedPath()
	wantQuery       map[string][]string // expected decoded query params
	wantBody        map[string]any      // expected decoded JSON request body (writes)
	wantMultipart   *rawMultipart
	checkJSON       bool   // assert stdout is indented JSON echoing the response
	wantErr         string // when set, Execute must fail with this substring
	wantNoCall      bool   // when set, the API must not be reached
	wantIdempotency string
}

type rawMetadata struct {
	Operations []rawOperation `json:"operations"`
}

type rawOperation struct {
	OperationID string `json:"operationId"`
	Method      string `json:"method"`
	Request     struct {
		Kind string `json:"kind"`
	} `json:"request"`
	Success struct {
		Kind string `json:"kind"`
	} `json:"success"`
	Confirmation string `json:"confirmation"`
	Parameters   []struct {
		Name     string `json:"name"`
		In       string `json:"in"`
		Required bool   `json:"required"`
	} `json:"parameters"`
	Query []struct {
		Name string `json:"name"`
	} `json:"query"`
	Pagination *struct {
		Inputs []struct {
			Name string `json:"name"`
		} `json:"inputs"`
	} `json:"pagination"`
}

func rawCommandCases() []rawCase {
	return []rawCase{
		// ---- reads / lists: method, path, query wiring ----
		{
			name:        "list-spaces with pagination and expand",
			operationID: "listSpaces",
			args:        []string{"list-spaces", "--page", "1", "--page-size", "2", "--expand", "board"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces",
			wantQuery:   rawQuery("page", "1", "pageSize", "2", "expand", "board"),
			checkJSON:   true,
		},
		{
			name:        "list-teams pagination",
			operationID: "listTeams",
			args:        []string{"list-teams", "--page", "3", "--page-size", "4"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/teams",
			wantQuery:   rawQuery("page", "3", "pageSize", "4"),
		},
		{
			name:        "list-users filters and pagination",
			operationID: "listUsers",
			args:        []string{"list-users", "--emails", "one@example.test", "--emails", "two@example.test", "--status", "ACTIVE", "--type", "MEMBER", "--page", "6", "--page-size", "7"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/users",
			wantQuery: map[string][]string{
				"emails":   {"one@example.test", "two@example.test"},
				"status":   {"ACTIVE"},
				"type":     {"MEMBER"},
				"page":     {"6"},
				"pageSize": {"7"},
			},
		},
		{
			name:        "list-boards path param and pagination",
			operationID: "listBoards",
			args:        []string{"list-boards", "--space-id", "7", "--page", "2", "--page-size", "8"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/7/boards",
			wantQuery:   rawQuery("page", "2", "pageSize", "8"),
		},
		{
			name:        "list-items path params and every query flag",
			operationID: "listItems",
			args:        []string{"list-items", "--space-id", "1", "--board-id", "2", "--board-view-id", "4", "--parent-id", "3", "--subitems-behaviour", "EMBED", "--page", "5", "--page-size", "9", "--expand", "space,board"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/1/boards/2/items",
			wantQuery: rawQuery(
				"boardViewId", "4", "parentId", "3", "subitemsBehaviour", "EMBED", "page", "5", "pageSize", "9", "expand", "space,board",
			),
		},
		{
			name:        "get-space single param plus expand",
			operationID: "getSpace",
			args:        []string{"get-space", "--space-id", "9", "--expand", "board"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/9",
			wantQuery:   rawQuery("expand", "board"),
			checkJSON:   true,
		},
		{
			name:        "get-team single param",
			operationID: "getTeam",
			args:        []string{"get-team", "--team-id", "42"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/teams/42",
		},
		{
			name:        "get-current-user no params",
			operationID: "getCurrentUser",
			args:        []string{"get-current-user"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/users/me",
		},
		{
			name:        "get-board nested params",
			operationID: "getBoard",
			args:        []string{"get-board", "--space-id", "1", "--board-id", "2"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/1/boards/2",
		},
		{
			name:        "get-item nested params plus expand",
			operationID: "getItem",
			args:        []string{"get-item", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--expand", "fields"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3",
			wantQuery:   rawQuery("expand", "fields"),
		},
		{
			name:        "list-subitems deep path and every query flag",
			operationID: "listSubitems",
			args:        []string{"list-subitems", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--page", "2", "--page-size", "4", "--expand", "fields"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/sub-items",
			wantQuery:   rawQuery("page", "2", "pageSize", "4", "expand", "fields"),
		},
		{
			name:        "list-item-comments deep path",
			operationID: "listItemComments",
			args:        []string{"list-item-comments", "--space-id", "1", "--board-id", "2", "--item-id", "3"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/comments",
		},
		{
			name:        "list-item-groups pagination",
			operationID: "listItemGroups",
			args:        []string{"list-item-groups", "--space-id", "1", "--board-id", "2", "--page", "2", "--page-size", "10"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/1/boards/2/item-groups",
			wantQuery:   rawQuery("page", "2", "pageSize", "10"),
		},
		{
			name:            "create-item-group JSON with explicit idempotency",
			operationID:     "createItemGroup",
			args:            []string{"create-item-group", "--space-id", "1", "--board-id", "2", "--body", `{"title":"Backlog"}`, "--idempotency-key", "group-create-1"},
			wantMethod:      http.MethodPost,
			wantPath:        "/v1/public/spaces/1/boards/2/item-groups",
			wantBody:        map[string]any{"title": "Backlog"},
			wantIdempotency: "group-create-1",
		},
		{
			name:        "delete-item-group confirmed and bodyless",
			operationID: "deleteItemGroup",
			args:        []string{"delete-item-group", "--space-id", "1", "--board-id", "2", "--item-group-id", "3", "--confirm"},
			wantMethod:  http.MethodDelete,
			wantPath:    "/v1/public/spaces/1/boards/2/item-groups/3",
		},
		{
			name:        "get-item-group",
			operationID: "getItemGroup",
			args:        []string{"get-item-group", "--space-id", "1", "--board-id", "2", "--item-group-id", "3"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/1/boards/2/item-groups/3",
		},
		{
			name:        "update-item-group JSON",
			operationID: "updateItemGroup",
			args:        []string{"update-item-group", "--space-id", "1", "--board-id", "2", "--item-group-id", "3", "--body", `{"title":"Doing"}`},
			wantMethod:  http.MethodPut,
			wantPath:    "/v1/public/spaces/1/boards/2/item-groups/3",
			wantBody:    map[string]any{"title": "Doing"},
		},
		{
			name:        "archive-item-group confirmed and bodyless",
			operationID: "archiveItemGroup",
			args:        []string{"archive-item-group", "--space-id", "1", "--board-id", "2", "--item-group-id", "3", "--confirm"},
			wantMethod:  http.MethodPut,
			wantPath:    "/v1/public/spaces/1/boards/2/item-groups/3/archive",
		},
		{
			name:        "list-item-files bare array",
			operationID: "listItemFiles",
			args:        []string{"list-item-files", "--space-id", "1", "--board-id", "2", "--item-id", "3"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/files",
		},
		{
			name:          "upload-item-file multipart stdin",
			operationID:   "uploadItemFile",
			args:          []string{"upload-item-file", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--file", "-", "--filename", "fixture.txt", "--content-type", "text/plain"},
			stdin:         "upload-bytes",
			wantMethod:    http.MethodPost,
			wantPath:      "/v1/public/spaces/1/boards/2/items/3/files",
			wantMultipart: &rawMultipart{fieldName: "file", fileName: "fixture.txt", contentType: "text/plain", bytes: []byte("upload-bytes")},
		},
		{
			name:        "delete-item-file confirmed and bodyless",
			operationID: "deleteItemFile",
			args:        []string{"delete-item-file", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-file-id", "4", "--confirm"},
			wantMethod:  http.MethodDelete,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/files/4",
		},
		{
			name:        "get-item-file",
			operationID: "getItemFile",
			args:        []string{"get-item-file", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-file-id", "4"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/files/4",
		},
		{
			name:        "update-item-file JSON",
			operationID: "updateItemFile",
			args:        []string{"update-item-file", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-file-id", "4", "--body", `{"name":"renamed.txt"}`},
			wantMethod:  http.MethodPut,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/files/4",
			wantBody:    map[string]any{"name": "renamed.txt"},
		},
		{
			name:        "get-item-file-download one JSON response",
			operationID: "getItemFileDownload",
			args:        []string{"get-item-file-download", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-file-id", "4"},
			wantMethod:  http.MethodGet,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/files/4/download",
		},

		// ---- writes: method, path, JSON body wiring ----
		{
			name:        "create-item inline body",
			operationID: "createItem",
			args:        []string{"create-item", "--space-id", "1", "--board-id", "2", "--body", `{"title":"From raw"}`},
			wantMethod:  http.MethodPost,
			wantPath:    "/v1/public/spaces/1/boards/2/items",
			wantBody:    map[string]any{"title": "From raw"},
		},
		{
			name:        "update-item-field PATCH with field key in path",
			operationID: "updateItemField",
			args:        []string{"update-item-field", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-field-key", "status-1", "--body", `{"value":"Done"}`},
			wantMethod:  http.MethodPatch,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/fields/status-1",
			wantBody:    map[string]any{"value": "Done"},
		},
		{
			name:        "update-item-fields PATCH",
			operationID: "updateItemFields",
			args:        []string{"update-item-fields", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--body", `{"string-1":"hi"}`},
			wantMethod:  http.MethodPatch,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/fields",
			wantBody:    map[string]any{"string-1": "hi"},
		},
		{
			name:        "create-item-comment POST",
			operationID: "createItemComment",
			args:        []string{"create-item-comment", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--body", `{"text":"hello"}`},
			wantMethod:  http.MethodPost,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/comments",
			wantBody:    map[string]any{"text": "hello"},
		},
		{
			name:        "update-item-comment PUT",
			operationID: "updateItemComment",
			args:        []string{"update-item-comment", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-comment-id", "5", "--body", `{"text":"edit"}`},
			wantMethod:  http.MethodPut,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/comments/5",
			wantBody:    map[string]any{"text": "edit"},
		},
		{
			name:        "replace-comment-reactions PUT spec body shape",
			operationID: "replaceCommentReactions",
			args:        []string{"replace-comment-reactions", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-comment-id", "5", "--body", `{"reactions":[{"value":"1f44d"}]}`},
			wantMethod:  http.MethodPut,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/comments/5/reactions",
			wantBody:    map[string]any{"reactions": []any{map[string]any{"value": "1f44d"}}},
		},

		// ---- deletes: --confirm gate satisfied ----
		{
			name:        "delete-item with confirm",
			operationID: "deleteItem",
			args:        []string{"delete-item", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--confirm"},
			wantMethod:  http.MethodDelete,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3",
		},
		{
			name:        "delete-item-comment with confirm",
			operationID: "deleteItemComment",
			args:        []string{"delete-item-comment", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-comment-id", "5", "--confirm"},
			wantMethod:  http.MethodDelete,
			wantPath:    "/v1/public/spaces/1/boards/2/items/3/comments/5",
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
}

func TestRawCommandsTableDriven(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	cases := rawCommandCases()
	operations := loadRawOperations(t)
	covered := map[string]bool{}
	for _, tc := range cases {
		if tc.operationID == "" {
			continue
		}
		if covered[tc.operationID] {
			t.Fatalf("operation %s has more than one canonical table row", tc.operationID)
		}
		covered[tc.operationID] = true
		operation, ok := operations[tc.operationID]
		if !ok {
			t.Fatalf("table row %s is not present in operation metadata", tc.operationID)
		}
		assertRawCaseCoversMetadata(t, tc, operation)
	}
	if len(covered) != len(operations) {
		var missing []string
		for operationID := range operations {
			if !covered[operationID] {
				missing = append(missing, operationID)
			}
		}
		t.Fatalf("raw table covers %d/%d metadata operations; missing %v", len(covered), len(operations), missing)
	}
	if len(operations) != 32 {
		t.Fatalf("operation metadata contains %d operations, want 32", len(operations))
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
				if !stringSlicesEqual(got, want) {
					t.Fatalf("query[%q] = %v, want %v", key, got, want)
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
			if rec.err != nil {
				t.Fatalf("record request: %v", rec.err)
			}
			if tc.wantMultipart != nil && !multipartEqual(rec.multipart, tc.wantMultipart) {
				t.Fatalf("multipart = %#v, want %#v", rec.multipart, tc.wantMultipart)
			}
			if rec.idempotency != tc.wantIdempotency {
				t.Fatalf("Idempotency-Key = %q, want %q", rec.idempotency, tc.wantIdempotency)
			}
			if rec.apiKey != "from-flag" {
				t.Fatalf("X-API-Key was not sent to the API")
			}
			if strings.Contains(out, "from-flag") {
				t.Fatalf("stdout leaked the API key: %s", out)
			}
			if tc.operationID != "" {
				operation := operations[tc.operationID]
				assertRawRequestKind(t, operation, rec)
				assertRawOutput(t, operation, out)
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

func rawQuery(values ...string) map[string][]string {
	if len(values)%2 != 0 {
		panic("rawQuery requires key/value pairs")
	}
	out := make(map[string][]string, len(values)/2)
	for i := 0; i < len(values); i += 2 {
		out[values[i]] = []string{values[i+1]}
	}
	return out
}

func loadRawOperations(t *testing.T) map[string]rawOperation {
	t.Helper()
	_, current, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve raw table test path")
	}
	path := filepath.Join(filepath.Dir(current), "..", "..", "..", "openapi", "plaky115-operation-metadata.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read operation metadata: %v", err)
	}
	var metadata rawMetadata
	if err := json.Unmarshal(raw, &metadata); err != nil {
		t.Fatalf("decode operation metadata: %v", err)
	}
	out := make(map[string]rawOperation, len(metadata.Operations))
	for _, operation := range metadata.Operations {
		if _, exists := out[operation.OperationID]; exists {
			t.Fatalf("duplicate operation metadata for %s", operation.OperationID)
		}
		out[operation.OperationID] = operation
	}
	return out
}

func assertRawCaseCoversMetadata(t *testing.T, tc rawCase, operation rawOperation) {
	t.Helper()
	if len(tc.args) == 0 || tc.args[0] != camelFlag(operation.OperationID) {
		t.Fatalf("%s command = %v, want %s", operation.OperationID, tc.args, camelFlag(operation.OperationID))
	}
	if tc.wantMethod != operation.Method {
		t.Fatalf("%s method = %s, metadata = %s", operation.OperationID, tc.wantMethod, operation.Method)
	}
	for _, parameter := range operation.Parameters {
		if parameter.In == "path" && parameter.Required && !hasFlag(tc.args, "--"+camelFlag(parameter.Name)) {
			t.Fatalf("%s canonical row omits required path flag --%s", operation.OperationID, camelFlag(parameter.Name))
		}
	}
	queryNames := map[string]bool{}
	for _, parameter := range operation.Query {
		queryNames[parameter.Name] = true
	}
	if operation.Pagination != nil {
		for _, parameter := range operation.Pagination.Inputs {
			queryNames[parameter.Name] = true
		}
	}
	for name := range queryNames {
		if !hasFlag(tc.args, "--"+camelFlag(name)) {
			t.Fatalf("%s canonical row omits query flag --%s", operation.OperationID, camelFlag(name))
		}
	}
	switch operation.Request.Kind {
	case "json":
		if !hasFlag(tc.args, "--body") {
			t.Fatalf("%s canonical row omits --body", operation.OperationID)
		}
	case "multipart":
		if !hasFlag(tc.args, "--file") || !hasFlag(tc.args, "--filename") || !hasFlag(tc.args, "--content-type") {
			t.Fatalf("%s canonical row must cover file, filename, and content-type flags", operation.OperationID)
		}
	case "none":
	default:
		t.Fatalf("%s has unsupported request kind %q", operation.OperationID, operation.Request.Kind)
	}
	if operation.Confirmation == "destructive" && !hasFlag(tc.args, "--confirm") {
		t.Fatalf("%s canonical row omits --confirm", operation.OperationID)
	}
}

func assertRawRequestKind(t *testing.T, operation rawOperation, rec *rawRecording) {
	t.Helper()
	switch operation.Request.Kind {
	case "none":
		if len(rec.rawBody) != 0 || rec.contentType != "" {
			t.Fatalf("%s sent body/content-type: %d bytes, %q", operation.OperationID, len(rec.rawBody), rec.contentType)
		}
	case "json":
		if rec.body == nil || rec.contentType != "application/json" {
			t.Fatalf("%s JSON request = %#v with content-type %q", operation.OperationID, rec.body, rec.contentType)
		}
	case "multipart":
		if rec.multipart == nil || !strings.HasPrefix(rec.contentType, "multipart/form-data; boundary=") {
			t.Fatalf("%s multipart request = %#v with content-type %q", operation.OperationID, rec.multipart, rec.contentType)
		}
	}
}

func assertRawOutput(t *testing.T, operation rawOperation, out string) {
	t.Helper()
	switch operation.Success.Kind {
	case "void":
		if out != "ok\n" {
			t.Fatalf("%s void output = %q", operation.OperationID, out)
		}
	case "json-array":
		var value []any
		if err := json.Unmarshal([]byte(out), &value); err != nil {
			t.Fatalf("%s output is not a top-level JSON array: %v\n%s", operation.OperationID, err, out)
		}
	case "json-object":
		var value map[string]any
		if err := json.Unmarshal([]byte(out), &value); err != nil {
			t.Fatalf("%s output is not one JSON object: %v\n%s", operation.OperationID, err, out)
		}
	default:
		t.Fatalf("%s has unsupported success kind %q", operation.OperationID, operation.Success.Kind)
	}
}

func camelFlag(value string) string {
	var out strings.Builder
	for i, r := range value {
		if unicode.IsUpper(r) && i > 0 {
			out.WriteByte('-')
		}
		out.WriteRune(unicode.ToLower(r))
	}
	return out.String()
}

func hasFlag(args []string, name string) bool {
	for _, arg := range args {
		if arg == name || strings.HasPrefix(arg, name+"=") {
			return true
		}
	}
	return false
}

func stringSlicesEqual(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for i := range left {
		if left[i] != right[i] {
			return false
		}
	}
	return true
}

func multipartEqual(left, right *rawMultipart) bool {
	if left == nil || right == nil {
		return left == right
	}
	return left.fieldName == right.fieldName && left.fileName == right.fileName && left.contentType == right.contentType && bytes.Equal(left.bytes, right.bytes)
}

func TestRawJSONCommandsRejectMissingAndInvalidBody(t *testing.T) {
	operations := loadRawOperations(t)
	for _, tc := range rawCommandCases() {
		operation, ok := operations[tc.operationID]
		if !ok || operation.Request.Kind != "json" {
			continue
		}
		base := withoutFlag(tc.args, "--body")
		for _, probe := range []struct {
			name    string
			args    []string
			wantErr string
		}{
			{name: "missing", args: base, wantErr: "--body is required"},
			{name: "invalid", args: append(append([]string{}, base...), "--body", "{not-json}"), wantErr: "invalid --body JSON"},
		} {
			t.Run(tc.operationID+"/"+probe.name, func(t *testing.T) {
				server, rec := rawRecorder(t)
				defer server.Close()
				args := append([]string{"--api-key", "from-flag", "--server-url", server.URL, "raw"}, probe.args...)
				out, err := executeRoot(t, args...)
				if err == nil || !strings.Contains(err.Error(), probe.wantErr) {
					t.Fatalf("error = %v, want %q; output %s", err, probe.wantErr, out)
				}
				if rec.called {
					t.Fatal("invalid JSON command reached the API")
				}
				if strings.Contains(out+err.Error(), "from-flag") {
					t.Fatal("error output leaked the API key")
				}
			})
		}
	}
}

func TestRawUploadItemFileValidationAndMultipart(t *testing.T) {
	base := []string{"upload-item-file", "--space-id", "1", "--board-id", "2", "--item-id", "3"}
	probes := []struct {
		name    string
		args    []string
		stdin   string
		wantErr string
	}{
		{name: "missing file", args: base, wantErr: "--file is required"},
		{name: "stdin missing filename", args: append(append([]string{}, base...), "--file", "-"), stdin: "bytes", wantErr: "--filename is required"},
		{name: "unreadable file", args: append(append([]string{}, base...), "--file", filepath.Join(t.TempDir(), "missing.bin")), wantErr: "open --file"},
	}
	for _, probe := range probes {
		t.Run(probe.name, func(t *testing.T) {
			server, rec := rawRecorder(t)
			defer server.Close()
			args := append([]string{"--api-key", "from-flag", "--server-url", server.URL, "raw"}, probe.args...)
			out, err := executeRootWithInput(t, bytes.NewBufferString(probe.stdin), args...)
			if err == nil || !strings.Contains(err.Error(), probe.wantErr) {
				t.Fatalf("error = %v, want %q; output %s", err, probe.wantErr, out)
			}
			if rec.called {
				t.Fatal("invalid upload reached the API")
			}
		})
	}

	t.Run("file bytes and optional content type", func(t *testing.T) {
		server, rec := rawRecorder(t)
		defer server.Close()
		path := filepath.Join(t.TempDir(), "source.bin")
		if err := os.WriteFile(path, []byte{0, 1, 2, 255}, 0o600); err != nil {
			t.Fatal(err)
		}
		out, err := executeRoot(t,
			"--api-key", "from-flag", "--server-url", server.URL, "raw",
			"upload-item-file", "--space-id", "1", "--board-id", "2", "--item-id", "3",
			"--file", path, "--filename", "renamed.bin", "--content-type", "application/x-fixture",
		)
		if err != nil {
			t.Fatalf("upload failed: %v\n%s", err, out)
		}
		want := &rawMultipart{fieldName: "file", fileName: "renamed.bin", contentType: "application/x-fixture", bytes: []byte{0, 1, 2, 255}}
		if !multipartEqual(rec.multipart, want) {
			t.Fatalf("multipart = %#v, want %#v", rec.multipart, want)
		}
	})
}

func TestRawArchiveAndDeletesRequireConfirmationAndSendNoBody(t *testing.T) {
	operations := loadRawOperations(t)
	for _, tc := range rawCommandCases() {
		operation, ok := operations[tc.operationID]
		if !ok || operation.Confirmation != "destructive" {
			continue
		}
		t.Run(tc.operationID, func(t *testing.T) {
			server, rec := rawRecorder(t)
			defer server.Close()
			base := []string{"--api-key", "from-flag", "--server-url", server.URL, "raw"}
			out, err := executeRoot(t, append(base, withoutFlag(tc.args, "--confirm")...)...)
			if err == nil || !strings.Contains(err.Error(), "--confirm is required") {
				t.Fatalf("missing confirmation error = %v; output %s", err, out)
			}
			if rec.called {
				t.Fatal("unconfirmed destructive command reached the API")
			}

			out, err = executeRoot(t, append(base, tc.args...)...)
			if err != nil {
				t.Fatalf("confirmed command failed: %v\n%s", err, out)
			}
			if len(rec.rawBody) != 0 || rec.contentType != "" {
				t.Fatalf("confirmed bodyless command sent %d bytes with content-type %q", len(rec.rawBody), rec.contentType)
			}
			if out != "ok\n" {
				t.Fatalf("void receipt = %q", out)
			}
		})
	}
}

func TestRawListItemFilesPreservesBareArray(t *testing.T) {
	server, _ := rawRecorder(t)
	defer server.Close()
	out, err := executeRoot(t, "--api-key", "from-flag", "--server-url", server.URL, "raw", "list-item-files", "--space-id", "1", "--board-id", "2", "--item-id", "3")
	if err != nil {
		t.Fatal(err)
	}
	var files []map[string]any
	if err := json.Unmarshal([]byte(out), &files); err != nil || len(files) != 1 {
		t.Fatalf("list item files output = %q, decode error = %v", out, err)
	}
	if strings.Contains(out, `"data"`) || strings.Contains(out, `"hasMore"`) {
		t.Fatalf("bare array was wrapped as a paged response: %s", out)
	}
}

func TestRawDownloadLinkPrintsSingleJSONDocument(t *testing.T) {
	server, _ := rawRecorder(t)
	defer server.Close()
	out, err := executeRoot(t, "--api-key", "from-flag", "--server-url", server.URL, "raw", "get-item-file-download", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-file-id", "4")
	if err != nil {
		t.Fatal(err)
	}
	const signedURL = "https://download.example.test/file?signature=one"
	if strings.Count(out, signedURL) != 1 {
		t.Fatalf("signed URL appeared %d times, want once: %s", strings.Count(out, signedURL), out)
	}
	decoder := json.NewDecoder(strings.NewReader(out))
	var response map[string]any
	if err := decoder.Decode(&response); err != nil {
		t.Fatal(err)
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		t.Fatalf("download command printed more than one JSON response: %v", err)
	}
}

func TestRawHelpIsDeterministicAndListsAllOperations(t *testing.T) {
	first, err := executeRoot(t, "raw", "--help")
	if err != nil {
		t.Fatal(err)
	}
	second, err := executeRoot(t, "raw", "--help")
	if err != nil {
		t.Fatal(err)
	}
	if first != second {
		t.Fatal("raw help changed between identical command constructions")
	}
	for operationID := range loadRawOperations(t) {
		if !strings.Contains(first, camelFlag(operationID)) {
			t.Fatalf("raw help omits %s", camelFlag(operationID))
		}
	}
}

func withoutFlag(args []string, name string) []string {
	out := make([]string, 0, len(args))
	for i := 0; i < len(args); i++ {
		if args[i] == name {
			if i+1 < len(args) && !strings.HasPrefix(args[i+1], "--") {
				i++
			}
			continue
		}
		if strings.HasPrefix(args[i], name+"=") {
			continue
		}
		out = append(out, args[i])
	}
	return out
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
