package cli

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func executeRoot(t *testing.T, args ...string) (string, error) {
	t.Helper()
	return executeRootWithInput(t, nil, args...)
}

func executeRootWithInput(t *testing.T, input *bytes.Buffer, args ...string) (string, error) {
	t.Helper()
	cmd, err := NewRootCommand()
	if err != nil {
		t.Fatalf("NewRootCommand() error = %v", err)
	}
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	if input != nil {
		cmd.SetIn(input)
	}
	cmd.SetArgs(args)
	err = cmd.Execute()
	return out.String(), err
}

func TestDoctorUsesPersistentFlagsAtExecutionTime(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	out, err := executeRoot(t, "--api-key", "from-flag", "--server-url", "https://plaky.test", "doctor")
	if err != nil {
		t.Fatalf("doctor returned error: %v", err)
	}

	if !strings.Contains(out, "serverURL        : https://plaky.test") {
		t.Fatalf("doctor did not use --server-url, output:\n%s", out)
	}
	if !strings.Contains(out, "apiKeyConfigured : yes") {
		t.Fatalf("doctor did not use --api-key, output:\n%s", out)
	}
}

func TestDoctorFallsBackToEnvironment(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "from-env")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	out, err := executeRoot(t, "doctor")
	if err != nil {
		t.Fatalf("doctor returned error: %v", err)
	}
	if !strings.Contains(out, "apiKeyConfigured : yes") {
		t.Fatalf("doctor did not use PLAKY115_API_KEY, output:\n%s", out)
	}
}

func TestHelpWorksWithoutAuth(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	out, err := executeRoot(t, "--help")
	if err != nil {
		t.Fatalf("--help returned error: %v", err)
	}
	if !strings.Contains(out, "Usage:") {
		t.Fatalf("help output missing usage:\n%s", out)
	}
}

func TestRawCommandUsesPersistentFlagClient(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	var sawAuth bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/public/spaces" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		sawAuth = r.Header.Get("X-API-Key") == "from-flag"
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[],"hasMore":false}`))
	}))
	defer server.Close()

	_, err := executeRoot(t, "--api-key", "from-flag", "--server-url", server.URL, "raw", "list-spaces")
	if err != nil {
		t.Fatalf("raw list-spaces returned error: %v", err)
	}
	if !sawAuth {
		t.Fatal("raw command did not pass --api-key to HTTP client")
	}
}

func TestRawCommandEscapesPathParams(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	var gotPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.EscapedPath()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"space/with slash"}`))
	}))
	defer server.Close()

	_, err := executeRoot(t,
		"--api-key", "from-flag",
		"--server-url", server.URL,
		"raw", "get-space",
		"--space-id", "space/with slash",
	)
	if err != nil {
		t.Fatalf("raw get-space returned error: %v", err)
	}

	want := "/v1/public/spaces/space%2Fwith%20slash"
	if gotPath != want {
		t.Fatalf("raw path params must be URL-escaped, got %q want %q", gotPath, want)
	}
}

func TestRawCreatePassesIdempotencyKeyAndInlineBody(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	var gotIdempotency string
	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotIdempotency = r.Header.Get("Idempotency-Key")
		if err := json.NewDecoder(r.Body).Decode(&gotBody); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":1}`))
	}))
	defer server.Close()

	_, err := executeRoot(t,
		"--api-key", "from-flag",
		"--server-url", server.URL,
		"raw", "create-item",
		"--space-id", "1",
		"--board-id", "2",
		"--idempotency-key", "import-1",
		"--body", `{"title":"From raw"}`,
	)
	if err != nil {
		t.Fatalf("raw create-item returned error: %v", err)
	}
	if gotIdempotency != "import-1" {
		t.Fatalf("Idempotency-Key header = %q", gotIdempotency)
	}
	if gotBody["title"] != "From raw" {
		t.Fatalf("body title = %#v", gotBody)
	}
}

func TestRawWriteRequiresBody(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	called := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		t.Fatalf("raw write without --body should not call API")
	}))
	defer server.Close()

	out, err := executeRoot(t,
		"--api-key", "from-flag",
		"--server-url", server.URL,
		"raw", "create-item",
		"--space-id", "1",
		"--board-id", "2",
	)
	if err == nil {
		t.Fatalf("raw create-item without --body succeeded, output:\n%s", out)
	}
	if called {
		t.Fatal("raw create-item without --body called API")
	}
	if !strings.Contains(err.Error(), "--body is required") {
		t.Fatalf("error = %v", err)
	}
}

func TestRawDeleteRequiresConfirm(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	called := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		t.Fatalf("raw delete without --confirm should not call API")
	}))
	defer server.Close()

	out, err := executeRoot(t,
		"--api-key", "from-flag",
		"--server-url", server.URL,
		"raw", "delete-item",
		"--space-id", "1",
		"--board-id", "2",
		"--item-id", "3",
	)
	if err == nil {
		t.Fatalf("raw delete-item without --confirm succeeded, output:\n%s", out)
	}
	if called {
		t.Fatal("raw delete-item without --confirm called API")
	}
	if !strings.Contains(err.Error(), "--confirm is required") {
		t.Fatalf("error = %v", err)
	}
}

func TestRawDeleteWithConfirmCallsAPI(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	var gotPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		if r.Method != http.MethodDelete {
			t.Fatalf("method = %s", r.Method)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"deleted":true}`))
	}))
	defer server.Close()

	_, err := executeRoot(t,
		"--api-key", "from-flag",
		"--server-url", server.URL,
		"raw", "delete-item",
		"--space-id", "1",
		"--board-id", "2",
		"--item-id", "3",
		"--confirm",
	)
	if err != nil {
		t.Fatalf("raw delete-item --confirm returned error: %v", err)
	}
	if gotPath != "/v1/public/spaces/1/boards/2/items/3" {
		t.Fatalf("path = %s", gotPath)
	}
}

func TestRawBodyReadsJSONFile(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	payload := t.TempDir() + "/payload.json"
	if err := os.WriteFile(payload, []byte(`{"title":"From file"}`), 0o600); err != nil {
		t.Fatalf("write payload: %v", err)
	}
	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&gotBody); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":1}`))
	}))
	defer server.Close()

	_, err := executeRoot(t,
		"--api-key", "from-flag",
		"--server-url", server.URL,
		"raw", "create-item",
		"--space-id", "1",
		"--board-id", "2",
		"--body", "@"+payload,
	)
	if err != nil {
		t.Fatalf("raw create-item returned error: %v", err)
	}
	if gotBody["title"] != "From file" {
		t.Fatalf("body title = %#v", gotBody)
	}
}

func TestRawBodyReadsStdin(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")

	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&gotBody); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":1}`))
	}))
	defer server.Close()

	_, err := executeRootWithInput(t,
		bytes.NewBufferString(`{"title":"From stdin"}`),
		"--api-key", "from-flag",
		"--server-url", server.URL,
		"raw", "create-item",
		"--space-id", "1",
		"--board-id", "2",
		"--body", "@-",
	)
	if err != nil {
		t.Fatalf("raw create-item returned error: %v", err)
	}
	if gotBody["title"] != "From stdin" {
		t.Fatalf("body title = %#v", gotBody)
	}
}

func TestPersistentTimeoutAndUserAgentFlagsConfigureClient(t *testing.T) {
	t.Setenv("PLAKY115_API_KEY", "")
	t.Setenv("PLAKY115_API_KEY_AUTH", "")
	cmd, err := NewRootCommand()
	if err != nil {
		t.Fatalf("NewRootCommand() error = %v", err)
	}
	cmd.SetArgs([]string{"--api-key", "from-flag", "--timeout", "7s", "--user-agent", "agent-test/1.0", "doctor"})
	if err := cmd.ParseFlags([]string{"--api-key", "from-flag", "--timeout", "7s", "--user-agent", "agent-test/1.0"}); err != nil {
		t.Fatalf("parse flags: %v", err)
	}
	client, err := buildClient(cmd)
	if err != nil {
		t.Fatalf("buildClient: %v", err)
	}
	if client.Timeout() != 7*time.Second {
		t.Fatalf("timeout = %s", client.Timeout())
	}
	if client.UserAgent() != "agent-test/1.0" {
		t.Fatalf("user agent = %q", client.UserAgent())
	}
}

func TestFormatErrorRedactsAPIKeyShapedValues(t *testing.T) {
	key := "plk_" + strings.Repeat("A", 16) + "_SECRET-ABC123"
	var out bytes.Buffer
	PrintError(&out, errors.New("upstream echoed "+key))
	got := out.String()
	if strings.Contains(got, key) {
		t.Fatalf("formatted error leaked key: %s", got)
	}
	if strings.Contains(got, "SECRET") || strings.Contains(got, "ABC123") {
		t.Fatalf("formatted error leaked key suffix: %s", got)
	}
	if !strings.Contains(got, "plk_[REDACTED]") {
		t.Fatalf("formatted error missing redaction marker: %s", got)
	}
}

func TestItemsBulkUpdateRedactsEmbeddedErrorDetails(t *testing.T) {
	key := "plk_TEST_SECRET_ABC123"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"message":"echoed ` + key + `"}`))
	}))
	defer server.Close()

	payload := t.TempDir() + "/updates.json"
	if err := os.WriteFile(payload, []byte(`[{"spaceId":"1","boardId":"2","itemId":"3","body":{"Status":"Done"}}]`), 0o600); err != nil {
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
	if strings.Contains(out, key) || strings.Contains(out, "SECRET_ABC123") {
		t.Fatalf("bulk update output leaked key: %s", out)
	}
	if !strings.Contains(out, "plk_[REDACTED]") {
		t.Fatalf("bulk update output missing redaction marker: %s", out)
	}
}

func TestGoSDKErrorBodyIsRedacted(t *testing.T) {
	key := "plk_" + strings.Repeat("B", 16) + "_SECRET-ABC123"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"message":"echoed ` + key + `"}`))
	}))
	defer server.Close()

	client, err := plakysdk.New(plakysdk.ClientOptions{APIKey: "test", ServerURL: server.URL})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}
	var out any
	err = client.Do(t.Context(), plakysdk.Request{Method: http.MethodGet, Path: "/boom"}, &out)
	if err == nil {
		t.Fatal("expected API error")
	}
	var apiErr *plakysdk.APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("error type = %T", err)
	}
	if strings.Contains(apiErr.Message, key) || strings.Contains(string(apiErr.Body), key) {
		t.Fatalf("APIError leaked key: message=%q body=%q", apiErr.Message, string(apiErr.Body))
	}
	if !strings.Contains(apiErr.Message, "plk_[REDACTED]") || !strings.Contains(string(apiErr.Body), "plk_[REDACTED]") {
		t.Fatalf("APIError missing redaction marker: message=%q body=%q", apiErr.Message, string(apiErr.Body))
	}
}

func TestWorkspaceMapDrainsPaginatedSpacesAndBoards(t *testing.T) {
	server := pagedWorkspaceServer(t)
	defer server.Close()
	client, err := plakysdk.New(plakysdk.ClientOptions{APIKey: "test", ServerURL: server.URL})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}
	cmd := newWorkspaceMapCommand(staticClientFactory(client))
	var out bytes.Buffer
	cmd.SetOut(&out)

	if err := cmd.Execute(); err != nil {
		t.Fatalf("workspace-map returned error: %v", err)
	}

	var got []map[string]any
	if err := json.Unmarshal(out.Bytes(), &got); err != nil {
		t.Fatalf("decode workspace-map output: %v\n%s", err, out.String())
	}
	if len(got) != 2 {
		t.Fatalf("workspace-map should include both paged spaces, got %d: %s", len(got), out.String())
	}
}

func TestCommentsThreadCommandListsComments(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/public/spaces/1/boards/2/items/3/comments" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"id":4,"text":"hello"}],"hasMore":false}`))
	}))
	defer server.Close()

	out, err := executeRoot(t,
		"--api-key", "from-flag",
		"--server-url", server.URL,
		"comments-thread",
		"--space-id", "1",
		"--board-id", "2",
		"--item-id", "3",
	)
	if err != nil {
		t.Fatalf("comments-thread returned error: %v", err)
	}
	if !strings.Contains(out, `"text": "hello"`) {
		t.Fatalf("comments-thread output = %s", out)
	}
}

func TestReactionsReplaceDryRunDoesNotCallAPI(t *testing.T) {
	called := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		t.Fatalf("dry-run should not call API")
	}))
	defer server.Close()

	out, err := executeRoot(t,
		"--api-key", "from-flag",
		"--server-url", server.URL,
		"reactions-replace",
		"--space-id", "1",
		"--board-id", "2",
		"--item-id", "3",
		"--comment-id", "4",
		"--body", `{"emojis":["thumbsup"]}`,
		"--dry-run",
	)
	if err != nil {
		t.Fatalf("reactions-replace --dry-run returned error: %v", err)
	}
	if called {
		t.Fatal("dry-run called API")
	}
	if !strings.Contains(out, `"dryRun": true`) || !strings.Contains(out, "replaceCommentReactions") {
		t.Fatalf("dry-run output = %s", out)
	}
}

func TestReactionsReplaceCallsAPI(t *testing.T) {
	var gotPath string
	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		if err := json.NewDecoder(r.Body).Decode(&gotBody); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	_, err := executeRoot(t,
		"--api-key", "from-flag",
		"--server-url", server.URL,
		"reactions-replace",
		"--space-id", "1",
		"--board-id", "2",
		"--item-id", "3",
		"--comment-id", "4",
		"--body", `{"emojis":["thumbsup"]}`,
	)
	if err != nil {
		t.Fatalf("reactions-replace returned error: %v", err)
	}
	if gotPath != "/v1/public/spaces/1/boards/2/items/3/comments/4/reactions" {
		t.Fatalf("path = %s", gotPath)
	}
	if gotBody["emojis"] == nil {
		t.Fatalf("body = %#v", gotBody)
	}
}

func TestFindItemsDrainsAllPages(t *testing.T) {
	server := pagedWorkspaceServer(t)
	defer server.Close()
	client, err := plakysdk.New(plakysdk.ClientOptions{APIKey: "test", ServerURL: server.URL})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}
	cmd := newFindCommand(staticClientFactory(client))
	cmd.SetArgs([]string{"--type", "item", "--query", "target", "--space-id", "1", "--board-id", "10"})
	var out bytes.Buffer
	cmd.SetOut(&out)

	if err := cmd.Execute(); err != nil {
		t.Fatalf("find returned error: %v", err)
	}

	var got []map[string]any
	if err := json.Unmarshal(out.Bytes(), &got); err != nil {
		t.Fatalf("decode find output: %v\n%s", err, out.String())
	}
	if len(got) != 1 || got[0]["id"] != float64(99) {
		t.Fatalf("find should include target item from page 2, got: %s", out.String())
	}
}

func staticClientFactory(client *plakysdk.Client) clientFactory {
	return func(*cobra.Command) (*plakysdk.Client, error) {
		return client, nil
	}
}

func pagedWorkspaceServer(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		page := r.URL.Query().Get("page")
		if page == "" {
			page = "1"
		}
		switch r.URL.Path {
		case "/v1/public/spaces":
			if page == "1" {
				_, _ = w.Write([]byte(`{"data":[{"id":1,"title":"Ops"}],"hasMore":true}`))
				return
			}
			_, _ = w.Write([]byte(`{"data":[{"id":2,"title":"Eng"}],"hasMore":false}`))
		case "/v1/public/spaces/1/boards":
			_, _ = w.Write([]byte(`{"data":[{"id":10,"title":"Roadmap"}],"hasMore":false}`))
		case "/v1/public/spaces/2/boards":
			_, _ = w.Write([]byte(`{"data":[{"id":20,"title":"Bugs"}],"hasMore":false}`))
		case "/v1/public/spaces/1/boards/10/items":
			if page == "1" {
				_, _ = w.Write([]byte(`{"data":[{"id":1,"title":"first"}],"hasMore":true}`))
				return
			}
			_, _ = w.Write([]byte(`{"data":[{"id":99,"title":"target item"}],"hasMore":false}`))
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
}
