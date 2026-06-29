package cli

import (
	"bytes"
	"strings"
	"testing"
)

// F15: the global --json flag turns a command failure into a JSON envelope on
// stderr. Exercised through the real Run() entrypoint (main() is a thin wrapper),
// not just PrintError directly. A raw write without --body fails offline after
// flags (including --json) are parsed, so no network or live key is needed.
func TestRunJSONErrorEnvelopeOnStderr(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := Run([]string{"--json", "--api-key", "ci-stub", "raw", "create-item", "--space-id", "1", "--board-id", "2"}, &stdout, &stderr)
	if code != 1 {
		t.Fatalf("expected exit code 1, got %d (stderr=%q)", code, stderr.String())
	}
	if !strings.Contains(stderr.String(), `"error"`) {
		t.Fatalf("expected JSON error envelope on stderr, got: %q", stderr.String())
	}
}

// Default (no --json) error stays plain text, with no JSON envelope.
func TestRunTextErrorOnStderr(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := Run([]string{"--api-key", "ci-stub", "raw", "create-item", "--space-id", "1", "--board-id", "2"}, &stdout, &stderr)
	if code != 1 {
		t.Fatalf("expected exit code 1, got %d", code)
	}
	if strings.Contains(stderr.String(), `"error"`) {
		t.Fatalf("expected plain text error (no JSON envelope), got: %q", stderr.String())
	}
}
