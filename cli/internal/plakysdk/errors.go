package plakysdk

import (
	"fmt"
	"regexp"
)

var secretPattern = regexp.MustCompile(`plk_[A-Za-z0-9_-]+`)

// RedactSecrets masks every plk_-style API key in s with plk_[REDACTED]. This
// is the single redaction helper shared by the SDK error decoder and the CLI
// error formatter; it uses the broad `+` pattern so short keys are masked too.
func RedactSecrets(s string) string {
	return secretPattern.ReplaceAllString(s, "plk_[REDACTED]")
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
