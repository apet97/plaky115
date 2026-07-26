package cli

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/apet97/plaky115-cli/internal/plakysdk"
)

// F17: curated commands enforce required flags via Cobra (MarkFlagRequired),
// not ad-hoc handler string checks.
func TestCuratedCommandsUseCobraRequiredFlags(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	cases := []struct {
		name string
		args []string
		want string
	}{
		{"comments-thread missing board/item", []string{"comments-thread", "--space-id", "1"}, "board-id"},
		{"items-create-simple missing all", []string{"items-create-simple"}, "space-id"},
		{"find missing type/query", []string{"find"}, "type"},
		{"fields-list missing board", []string{"fields-list", "--space-id", "1"}, "board-id"},
		{"items-bulk-update missing file", []string{"items-bulk-update"}, "file"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := executeRoot(t, tc.args...)
			if err == nil {
				t.Fatalf("expected required-flag error for %v", tc.args)
			}
			if !strings.Contains(err.Error(), "required flag(s)") {
				t.Fatalf("error not from Cobra required-flag check: %v", err)
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("error missing %q: %v", tc.want, err)
			}
		})
	}
}

// F16: items-bulk-update pre-validates identifiers per entry before any API
// call; malformed entries are reported "invalid" and never hit the network.
func TestItemsBulkUpdatePreValidatesEntries(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
		t.Fatal("invalid bulk-update entry must not call the API")
	}))
	defer server.Close()

	payload := t.TempDir() + "/updates.json"
	body := `[{"itemId":"3","body":{"x":1}},{"spaceId":"1","boardId":"2","body":{"y":2}}]`
	if err := os.WriteFile(payload, []byte(body), 0o600); err != nil {
		t.Fatalf("write payload: %v", err)
	}

	out, err := executeRoot(t,
		"--api-key", "from-flag",
		"--server-url", server.URL,
		"items-bulk-update",
		"--file", payload,
	)
	if err != nil {
		t.Fatalf("items-bulk-update returned error: %v", err)
	}

	var results []map[string]any
	if err := json.Unmarshal([]byte(out), &results); err != nil {
		t.Fatalf("decode results: %v\n%s", err, out)
	}
	if len(results) != 2 {
		t.Fatalf("want 2 results, got %d: %s", len(results), out)
	}
	for _, r := range results {
		if r["status"] != "invalid" {
			t.Fatalf("entry not marked invalid: %#v", r)
		}
	}
	if strings.Contains(out, `"updated"`) {
		t.Fatalf("invalid entries should not be updated: %s", out)
	}
}

// F15: --json renders errors as a structured, secret-redacted envelope.
func TestPrintErrorJSONEnvelope(t *testing.T) {
	secret := "plk_" + "SECRET_ABCDEFGH"
	apiErr := &plakysdk.APIError{Status: 404, Message: "not found " + secret, RequestID: "req-1"}

	var buf bytes.Buffer
	PrintError(&buf, apiErr, true)
	out := buf.String()

	if strings.Contains(out, "SECRET_ABCDEFGH") {
		t.Fatalf("JSON envelope leaked secret: %s", out)
	}
	var env struct {
		Error struct {
			Message   string `json:"message"`
			Status    int    `json:"status"`
			RequestID string `json:"requestId"`
		} `json:"error"`
	}
	if err := json.Unmarshal(buf.Bytes(), &env); err != nil {
		t.Fatalf("envelope is not valid JSON: %v\n%s", err, out)
	}
	if env.Error.Status != 404 {
		t.Fatalf("status = %d", env.Error.Status)
	}
	if env.Error.RequestID != "req-1" {
		t.Fatalf("requestId = %q", env.Error.RequestID)
	}
	if !strings.Contains(env.Error.Message, "plk_[REDACTED]") {
		t.Fatalf("message missing redaction marker: %q", env.Error.Message)
	}
}

// F15: text mode (default) stays one redacted line, no JSON envelope.
func TestPrintErrorTextModeUnchanged(t *testing.T) {
	secret := "plk_" + "SECRET_ABCDEFGH"
	var buf bytes.Buffer
	PrintError(&buf, &plakysdk.APIError{Status: 500, Message: "boom " + secret}, false)
	out := buf.String()
	if strings.Contains(out, "{") {
		t.Fatalf("text mode should not emit JSON: %s", out)
	}
	if strings.Contains(out, "SECRET_ABCDEFGH") || !strings.Contains(out, "plk_[REDACTED]") {
		t.Fatalf("text mode redaction broken: %s", out)
	}
}

func TestItemGroupsListDrainsPages(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if r.Method != http.MethodGet || r.URL.Path != "/v1/public/spaces/1/boards/2/item-groups" {
			t.Fatalf("request = %s %s", r.Method, r.URL.Path)
		}
		if r.URL.Query().Get("page") != "1" || r.URL.Query().Get("pageSize") != "200" {
			t.Fatalf("query = %s", r.URL.RawQuery)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"id":3,"title":"Backlog"}],"hasMore":false}`))
	}))
	defer server.Close()

	out, err := executeRoot(t, "--api-key", "from-flag", "--server-url", server.URL, "item-groups-list", "--space-id", "1", "--board-id", "2")
	if err != nil {
		t.Fatal(err)
	}
	var groups []map[string]any
	if err := json.Unmarshal([]byte(out), &groups); err != nil || len(groups) != 1 || groups[0]["title"] != "Backlog" {
		t.Fatalf("groups = %#v, error = %v, output = %s", groups, err, out)
	}
	if requests != 1 {
		t.Fatalf("requests = %d", requests)
	}
}

func TestItemGroupsCreateDryRunAndWrite(t *testing.T) {
	t.Run("dry run", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
			t.Fatal("dry-run create must not call the API")
		}))
		defer server.Close()
		out, err := executeRoot(t,
			"--api-key", "from-flag", "--server-url", server.URL,
			"item-groups-create", "--space-id", "1", "--board-id", "2", "--title", "Backlog", "--color", "#123456", "--ranking", "m", "--dry-run",
		)
		if err != nil {
			t.Fatal(err)
		}
		var plan map[string]any
		if err := json.Unmarshal([]byte(out), &plan); err != nil {
			t.Fatal(err)
		}
		if plan["dryRun"] != true || plan["operation"] != "createItemGroup" {
			t.Fatalf("plan = %#v", plan)
		}
		payload := plan["payload"].(map[string]any)
		body := payload["body"].(map[string]any)
		if body["title"] != "Backlog" || body["color"] != "#123456" || body["ranking"] != "m" {
			t.Fatalf("body = %#v", body)
		}
	})

	t.Run("write", func(t *testing.T) {
		server, rec := rawRecorder(t)
		defer server.Close()
		out, err := executeRoot(t,
			"--api-key", "from-flag", "--server-url", server.URL,
			"item-groups-create", "--space-id", "1", "--board-id", "2", "--title", "Backlog", "--idempotency-key", "create-group-1",
		)
		if err != nil {
			t.Fatal(err)
		}
		if rec.method != http.MethodPost || rec.escapedPath != "/v1/public/spaces/1/boards/2/item-groups" {
			t.Fatalf("request = %s %s", rec.method, rec.escapedPath)
		}
		if rec.body["title"] != "Backlog" || len(rec.body) != 1 || rec.idempotency != "create-group-1" {
			t.Fatalf("body/header = %#v / %q", rec.body, rec.idempotency)
		}
		if !json.Valid([]byte(out)) {
			t.Fatalf("output is not JSON: %s", out)
		}
	})
}

func TestItemGroupsArchiveDryRunAndConfirmation(t *testing.T) {
	t.Run("dry run needs no confirmation and does not write", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
			t.Fatal("dry-run archive must not call the API")
		}))
		defer server.Close()
		out, err := executeRoot(t,
			"--api-key", "from-flag", "--server-url", server.URL,
			"item-groups-archive", "--space-id", "1", "--board-id", "2", "--item-group-id", "3", "--dry-run",
		)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(out, `"dryRun": true`) || !strings.Contains(out, `"operation": "archiveItemGroup"`) {
			t.Fatalf("plan = %s", out)
		}
	})

	t.Run("live call requires confirmation", func(t *testing.T) {
		server, rec := rawRecorder(t)
		defer server.Close()
		base := []string{"--api-key", "from-flag", "--server-url", server.URL, "item-groups-archive", "--space-id", "1", "--board-id", "2", "--item-group-id", "3"}
		if _, err := executeRoot(t, base...); err == nil || !strings.Contains(err.Error(), "--confirm") {
			t.Fatalf("missing-confirm error = %v", err)
		}
		if rec.called {
			t.Fatal("unconfirmed archive reached the API")
		}
		out, err := executeRoot(t, append(base, "--confirm")...)
		if err != nil {
			t.Fatal(err)
		}
		if rec.method != http.MethodPut || rec.escapedPath != "/v1/public/spaces/1/boards/2/item-groups/3/archive" || len(rec.rawBody) != 0 || rec.contentType != "" {
			t.Fatalf("archive request = %#v", rec)
		}
		var receipt map[string]any
		if err := json.Unmarshal([]byte(out), &receipt); err != nil || receipt["ok"] != true {
			t.Fatalf("receipt = %q, error = %v", out, err)
		}
	})
}

func TestItemFilesListPreservesArray(t *testing.T) {
	server, rec := rawRecorder(t)
	defer server.Close()
	out, err := executeRoot(t, "--api-key", "from-flag", "--server-url", server.URL, "item-files-list", "--space-id", "1", "--board-id", "2", "--item-id", "3")
	if err != nil {
		t.Fatal(err)
	}
	if rec.method != http.MethodGet || rec.escapedPath != "/v1/public/spaces/1/boards/2/items/3/files" {
		t.Fatalf("request = %s %s", rec.method, rec.escapedPath)
	}
	var files []map[string]any
	if err := json.Unmarshal([]byte(out), &files); err != nil || len(files) != 1 {
		t.Fatalf("files = %#v, error = %v, output = %s", files, err, out)
	}
}

func TestItemFilesUploadSupportsFileAndStdin(t *testing.T) {
	t.Run("file", func(t *testing.T) {
		server, rec := rawRecorder(t)
		defer server.Close()
		path := t.TempDir() + "/source.bin"
		if err := os.WriteFile(path, []byte{0, 1, 2, 255}, 0o600); err != nil {
			t.Fatal(err)
		}
		_, err := executeRoot(t,
			"--api-key", "from-flag", "--server-url", server.URL,
			"item-files-upload", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--file", path, "--content-type", "application/x-fixture",
		)
		if err != nil {
			t.Fatal(err)
		}
		want := &rawMultipart{fieldName: "file", fileName: "source.bin", contentType: "application/x-fixture", bytes: []byte{0, 1, 2, 255}}
		if !multipartEqual(rec.multipart, want) {
			t.Fatalf("multipart = %#v, want %#v", rec.multipart, want)
		}
	})

	t.Run("stdin", func(t *testing.T) {
		server, rec := rawRecorder(t)
		defer server.Close()
		_, err := executeRootWithInput(t, bytes.NewBufferString("stdin-bytes"),
			"--api-key", "from-flag", "--server-url", server.URL,
			"item-files-upload", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--file", "-",
		)
		if err == nil || !strings.Contains(err.Error(), "--filename is required") {
			t.Fatalf("missing-filename error = %v", err)
		}
		if rec.called {
			t.Fatal("stdin upload without filename reached the API")
		}
		_, err = executeRootWithInput(t, bytes.NewBufferString("stdin-bytes"),
			"--api-key", "from-flag", "--server-url", server.URL,
			"item-files-upload", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--file", "-", "--filename", "stdin.txt",
		)
		if err != nil {
			t.Fatal(err)
		}
		want := &rawMultipart{fieldName: "file", fileName: "stdin.txt", contentType: "application/octet-stream", bytes: []byte("stdin-bytes")}
		if !multipartEqual(rec.multipart, want) {
			t.Fatalf("multipart = %#v, want %#v", rec.multipart, want)
		}
	})
}

func TestItemFilesDownloadLinkReturnsMetadataWithoutFollowingURL(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if r.Method != http.MethodGet || r.URL.Path != "/v1/public/spaces/1/boards/2/items/3/files/4/download" {
			t.Fatalf("request = %s %s", r.Method, r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"url":"https://download.invalid/file?signature=one","expiresInSeconds":60}`))
	}))
	defer server.Close()
	out, err := executeRoot(t,
		"--api-key", "from-flag", "--server-url", server.URL,
		"item-files-download-link", "--space-id", "1", "--board-id", "2", "--item-id", "3", "--item-file-id", "4",
	)
	if err != nil {
		t.Fatal(err)
	}
	if requests != 1 || strings.Count(out, "https://download.invalid/file?signature=one") != 1 {
		t.Fatalf("requests = %d, output = %s", requests, out)
	}
	var metadata map[string]any
	if err := json.Unmarshal([]byte(out), &metadata); err != nil || metadata["expiresInSeconds"] != float64(60) {
		t.Fatalf("metadata = %#v, error = %v", metadata, err)
	}
}
