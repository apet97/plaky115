package plakysdk

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

type redactionCorpus struct {
	Marker string `json:"marker"`
	Cases  []struct {
		Name          string   `json:"name"`
		InputParts    []string `json:"inputParts"`
		ExpectedParts []string `json:"expectedParts"`
	} `json:"cases"`
}

func loadRedactionCorpus(t *testing.T) redactionCorpus {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test fixture location")
	}
	path := filepath.Join(filepath.Dir(filename), "..", "..", "..", "test", "fixtures", "security", "plaky-api-key-cases.json")
	source, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read redaction corpus: %v", err)
	}
	if apiKeyPattern.Match(source) {
		t.Fatal("redaction corpus contains a complete token-shaped value")
	}
	var corpus redactionCorpus
	if err := json.Unmarshal(source, &corpus); err != nil {
		t.Fatalf("decode redaction corpus: %v", err)
	}
	return corpus
}

func corpusCase(t *testing.T, corpus redactionCorpus, name string) string {
	t.Helper()
	for _, entry := range corpus.Cases {
		if entry.Name == name {
			return strings.Join(entry.InputParts, "")
		}
	}
	t.Fatalf("missing redaction corpus case %q", name)
	return ""
}

func TestRedactSecretsSharedCorpus(t *testing.T) {
	corpus := loadRedactionCorpus(t)
	for _, entry := range corpus.Cases {
		t.Run(entry.Name, func(t *testing.T) {
			got := RedactSecrets(strings.Join(entry.InputParts, ""))
			want := strings.Join(entry.ExpectedParts, "")
			if got != want {
				t.Fatalf("RedactSecrets() = %q, want %q", got, want)
			}
		})
	}
}

func TestSecretAPIErrorBodyUsesCanonicalMarker(t *testing.T) {
	corpus := loadRedactionCorpus(t)
	first := corpusCase(t, corpus, "shortest-tail")
	second := corpusCase(t, corpus, "hyphen")
	body := []byte(`{"message":"` + first + ` then ` + second + `"}`)

	err := decodeError(400, body, "request-id")
	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("decodeError() type = %T", err)
	}
	want := `{"message":"` + corpus.Marker + ` then ` + corpus.Marker + `"}`
	if apiErr.Message != want || string(apiErr.Body) != want {
		t.Fatalf("redacted API error = %q / %q, want %q", apiErr.Message, apiErr.Body, want)
	}
}
