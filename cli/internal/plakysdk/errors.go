package plakysdk

import (
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

const (
	apiKeyRedactionMarker = "[REDACTED_PLAKY_API_KEY]"
	// MaxErrorDisplayBytes bounds text that can reach a terminal or machine
	// error envelope. Response bodies have a separate transport cap.
	MaxErrorDisplayBytes = 4 * 1024
)

var apiKeyPattern = regexp.MustCompile(`plk_[A-Za-z0-9_-]+`)

// RedactSecrets masks every Plaky-style API key in s with the canonical marker.
// This is the single redaction helper shared by the SDK error decoder and CLI.
func RedactSecrets(s string) string {
	return apiKeyPattern.ReplaceAllString(s, apiKeyRedactionMarker)
}

// SafeErrorText returns a redacted, single-line, UTF-8-safe error suitable for
// terminal and JSON presentation. It intentionally does not change stored
// transport diagnostics; callers use it only at the presentation boundary.
func SafeErrorText(s string) string {
	safe := RedactSecrets(s)
	var out strings.Builder
	out.Grow(minInt(len(safe), MaxErrorDisplayBytes))
	for _, r := range safe {
		encoded := string(r)
		if r <= 0x1f || (r >= 0x7f && r <= 0x9f) {
			encoded = fmt.Sprintf("\\u%04X", r)
		}
		if !utf8.ValidString(encoded) || out.Len()+len(encoded) > MaxErrorDisplayBytes {
			if out.Len()+len("…") <= MaxErrorDisplayBytes {
				out.WriteString("…")
			}
			break
		}
		out.WriteString(encoded)
	}
	return out.String()
}

func minInt(left, right int) int {
	if left < right {
		return left
	}
	return right
}

type APIError struct {
	Status    int
	Message   string
	RequestID string
	Body      []byte
}

func (e *APIError) Error() string {
	if e.RequestID != "" {
		return fmt.Sprintf("plaky API error (status=%d, request=%s): %s", e.Status, e.RequestID, e.Message)
	}
	return fmt.Sprintf("plaky API error (status=%d): %s", e.Status, e.Message)
}

func decodeError(status int, body []byte, reqID string) error {
	redacted := RedactSecrets(string(body))
	return &APIError{Status: status, Message: redacted, RequestID: reqID, Body: []byte(redacted)}
}
