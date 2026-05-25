package cli

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func executeRoot(t *testing.T, args ...string) (string, error) {
	t.Helper()
	cmd, err := NewRootCommand()
	if err != nil {
		t.Fatalf("NewRootCommand() error = %v", err)
	}
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
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
