package plakysdk

import "fmt"

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
	return &APIError{Status: status, Message: string(body), RequestID: reqID, Body: body}
}
