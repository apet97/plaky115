package plakysdk

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestClientDoReturnsResponseReadError(t *testing.T) {
	readErr := errors.New("fixture read failure")
	client := testClient(t, roundTripperFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       &errorReadCloser{err: readErr},
		}, nil
	}))
	var out any
	err := client.Do(t.Context(), Request{Method: http.MethodGet, Path: "/read-error"}, &out)
	if !errors.Is(err, readErr) {
		t.Fatalf("error = %v, want wrapped read error", err)
	}
	if !strings.Contains(err.Error(), "GET /read-error") {
		t.Fatalf("missing operation context: %v", err)
	}
}

func TestClientDoPreservesLargeJSONNumber(t *testing.T) {
	const payload = `{"id":9007199254740993123}`
	client := serverClient(t, http.StatusOK, payload, "")
	var out map[string]any
	if err := client.Do(t.Context(), Request{Method: http.MethodGet, Path: "/large"}, &out); err != nil {
		t.Fatal(err)
	}
	number, ok := out["id"].(json.Number)
	if !ok || number.String() != "9007199254740993123" {
		t.Fatalf("id = %#v", out["id"])
	}
	reencoded, err := json.Marshal(out)
	if err != nil {
		t.Fatal(err)
	}
	if string(reencoded) != payload {
		t.Fatalf("round trip = %s", reencoded)
	}
}

func TestDecodeRejectsTrailingJSON(t *testing.T) {
	client := serverClient(t, http.StatusOK, `{"ok":true} {"extra":true}`, "")
	var out any
	err := client.Do(t.Context(), Request{Method: http.MethodGet, Path: "/trailing"}, &out)
	if err == nil || !strings.Contains(err.Error(), "trailing JSON") {
		t.Fatalf("error = %v", err)
	}
}

func TestClientDoAcceptsEmpty200And204(t *testing.T) {
	for _, status := range []int{http.StatusOK, http.StatusNoContent} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			client := serverClient(t, status, "", "")
			var out map[string]any
			if err := client.Do(t.Context(), Request{Method: http.MethodGet, Path: "/empty"}, &out); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestClientDoReturnsStructuredAPIError(t *testing.T) {
	client := serverClient(t, http.StatusUnprocessableEntity, `{"message":"invalid"}`, "req-fixture")
	var out any
	err := client.Do(t.Context(), Request{Method: http.MethodPost, Path: "/invalid"}, &out)
	var apiErr *APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("error = %T %v", err, err)
	}
	if apiErr.Status != http.StatusUnprocessableEntity || apiErr.RequestID != "req-fixture" {
		t.Fatalf("APIError = %#v", apiErr)
	}
	if !bytes.Equal(apiErr.Body, []byte(`{"message":"invalid"}`)) {
		t.Fatalf("body = %s", apiErr.Body)
	}
}

func serverClient(t *testing.T, status int, body string, requestID string) *Client {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
		if requestID != "" {
			response.Header().Set("X-Request-ID", requestID)
		}
		response.WriteHeader(status)
		_, _ = io.WriteString(response, body)
	}))
	t.Cleanup(server.Close)
	client, err := New(ClientOptions{APIKey: "fixture", ServerURL: server.URL})
	if err != nil {
		t.Fatal(err)
	}
	return client
}

func testClient(t *testing.T, transport http.RoundTripper) *Client {
	t.Helper()
	client, err := New(ClientOptions{
		APIKey:     "fixture",
		ServerURL:  "https://example.test",
		HTTPClient: &http.Client{Transport: transport},
	})
	if err != nil {
		t.Fatal(err)
	}
	return client
}

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (function roundTripperFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return function(request)
}

type errorReadCloser struct {
	err error
}

func (reader *errorReadCloser) Read([]byte) (int, error) { return 0, reader.err }
func (reader *errorReadCloser) Close() error             { return nil }
