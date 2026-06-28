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
