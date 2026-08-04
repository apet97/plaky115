package plakysdk

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
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

func TestGeneratedOperationsRejectInvalidIDsBeforeNetwork(t *testing.T) {
	requests := 0
	client := testClient(t, roundTripperFunc(func(*http.Request) (*http.Response, error) {
		requests++
		return jsonResponse(http.StatusOK, `{}`), nil
	}))
	for _, id := range []string{"-1", "01", "9223372036854775808"} {
		if _, err := client.GetSpace(context.Background(), GetSpaceOptions{SpaceId: id}); err == nil {
			t.Fatalf("GetSpace(%q) succeeded", id)
		}
	}
	if requests != 0 {
		t.Fatalf("invalid IDs made %d requests", requests)
	}
}

func TestValidateJSONBody(t *testing.T) {
	if err := ValidateJSONBody(nil, false); err != nil {
		t.Fatalf("optional nil body: %v", err)
	}
	for _, body := range []any{nil, []any{}} {
		if err := ValidateJSONBody(body, true); err == nil {
			t.Fatalf("body %#v unexpectedly accepted", body)
		}
	}
	if err := ValidateJSONBody(map[string]any{"title": "x"}, true, "title", "color"); err == nil || !strings.Contains(err.Error(), "color") {
		t.Fatalf("missing property error = %v", err)
	}
	if err := ValidateJSONBody(map[string]any{}, true); err != nil {
		t.Fatalf("open object rejected: %v", err)
	}
}

func TestValidateResponseShape(t *testing.T) {
	tests := []struct {
		name    string
		kind    string
		value   any
		created bool
		signed  bool
		wantErr string
	}{
		{name: "paged", kind: "paged-object", value: map[string]any{"data": []any{}, "hasMore": false}},
		{name: "paged missing", kind: "paged-object", value: map[string]any{"data": []any{}}, wantErr: "hasMore"},
		{name: "paged empty more", kind: "paged-object", value: map[string]any{"data": []any{}, "hasMore": true}, wantErr: "empty page"},
		{name: "array", kind: "json-array", value: []any{}},
		{name: "array wrong root", kind: "json-array", value: map[string]any{}, wantErr: "array"},
		{name: "created id", kind: "json-object", value: map[string]any{"id": json.Number("9223372036854775807")}, created: true},
		{name: "created missing id", kind: "json-object", value: map[string]any{}, created: true, wantErr: "id"},
		{name: "signed link", kind: "json-object", value: map[string]any{"url": "https://example.test/file", "expiresInSeconds": json.Number("60")}, signed: true},
		{name: "insecure link", kind: "json-object", value: map[string]any{"url": "http://example.test/file"}, signed: true, wantErr: "HTTPS"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := ValidateResponseShape("fixture", test.kind, test.value, nil, test.created, test.signed)
			if test.wantErr == "" && err != nil {
				t.Fatalf("error = %v", err)
			}
			if test.wantErr != "" && (err == nil || !strings.Contains(err.Error(), test.wantErr)) {
				t.Fatalf("error = %v, want %q", err, test.wantErr)
			}
		})
	}
}

func TestClientDoConvertsOnlySafeJSONIntegers(t *testing.T) {
	const payload = `{"safe":9007199254740991,"positiveBoundary":9007199254740992,"negativeBoundary":-9007199254740992}`
	client := serverClient(t, http.StatusOK, payload, "")
	var out map[string]any
	if err := client.Do(t.Context(), Request{Method: http.MethodGet, Path: "/boundaries"}, &out); err != nil {
		t.Fatal(err)
	}
	if out["safe"] != float64(9007199254740991) {
		t.Fatalf("safe = %#v", out["safe"])
	}
	for _, key := range []string{"positiveBoundary", "negativeBoundary"} {
		if _, ok := out[key].(json.Number); !ok {
			t.Fatalf("%s = %#v, want json.Number", key, out[key])
		}
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

func TestJSONBodyWritesExactBytesAndContentType(t *testing.T) {
	var gotBody []byte
	var gotContentType string
	client := testClient(t, roundTripperFunc(func(request *http.Request) (*http.Response, error) {
		gotContentType = request.Header.Get("Content-Type")
		gotBody, _ = io.ReadAll(request.Body)
		return jsonResponse(http.StatusOK, `{}`), nil
	}))
	if err := client.Do(t.Context(), Request{
		Method:   http.MethodPost,
		Path:     "/json",
		JSONBody: map[string]any{"name": "fixture", "count": 2},
	}, new(any)); err != nil {
		t.Fatal(err)
	}
	if string(gotBody) != `{"count":2,"name":"fixture"}` {
		t.Fatalf("body = %s", gotBody)
	}
	if gotContentType != "application/json" {
		t.Fatalf("content type = %q", gotContentType)
	}
}

func TestMultipartStreamsPartMetadataAndBytes(t *testing.T) {
	payload := bytes.Repeat([]byte("streaming-fixture-"), 256*1024)
	reader := &chunkTrackingReader{reader: bytes.NewReader(payload)}
	var gotField, gotName, gotType string
	var gotBody []byte
	client := testClient(t, roundTripperFunc(func(request *http.Request) (*http.Response, error) {
		mediaType, params, err := mime.ParseMediaType(request.Header.Get("Content-Type"))
		if err != nil || mediaType != "multipart/form-data" {
			t.Fatalf("content type = %q, %v", request.Header.Get("Content-Type"), err)
		}
		part, err := multipart.NewReader(request.Body, params["boundary"]).NextPart()
		if err != nil {
			t.Fatal(err)
		}
		gotField, gotName, gotType = part.FormName(), part.FileName(), part.Header.Get("Content-Type")
		gotBody, err = io.ReadAll(part)
		if err != nil {
			t.Fatal(err)
		}
		return jsonResponse(http.StatusCreated, `{}`), nil
	}))
	err := client.Do(t.Context(), Request{
		Method: http.MethodPost,
		Path:   "/multipart",
		Multipart: &MultipartFileBody{
			FieldName:   "file",
			FileName:    "fixture.bin",
			ContentType: "application/x-fixture",
			Reader:      reader,
		},
	}, new(any))
	if err != nil {
		t.Fatal(err)
	}
	if gotField != "file" || gotName != "fixture.bin" || gotType != "application/x-fixture" {
		t.Fatalf("part = field %q name %q type %q", gotField, gotName, gotType)
	}
	if !bytes.Equal(gotBody, payload) {
		t.Fatalf("multipart bytes = %d, want %d", len(gotBody), len(payload))
	}
	if reader.maxRead >= len(payload) {
		t.Fatalf("upload was pre-buffered in one read: max=%d total=%d", reader.maxRead, len(payload))
	}
}

func TestJSONBodyAndMultipartAreMutuallyExclusive(t *testing.T) {
	called := false
	client := testClient(t, roundTripperFunc(func(*http.Request) (*http.Response, error) {
		called = true
		return jsonResponse(http.StatusOK, `{}`), nil
	}))
	err := client.Do(t.Context(), Request{
		Method:   http.MethodPost,
		Path:     "/ambiguous",
		JSONBody: map[string]any{"ok": true},
		Multipart: &MultipartFileBody{
			FieldName: "file",
			FileName:  "fixture",
			Reader:    strings.NewReader("fixture"),
		},
	}, nil)
	if err == nil || !strings.Contains(err.Error(), "mutually exclusive") {
		t.Fatalf("error = %v", err)
	}
	if called {
		t.Fatal("ambiguous request reached transport")
	}
}

func TestMultipartCopyFailureReachesCaller(t *testing.T) {
	copyErr := errors.New("fixture copy failure")
	client := testClient(t, roundTripperFunc(func(request *http.Request) (*http.Response, error) {
		_, err := io.Copy(io.Discard, request.Body)
		if err != nil {
			return nil, err
		}
		return jsonResponse(http.StatusOK, `{}`), nil
	}))
	err := client.Do(t.Context(), Request{
		Method: http.MethodPost,
		Path:   "/copy-error",
		Multipart: &MultipartFileBody{
			FieldName: "file",
			FileName:  "fixture",
			Reader:    &failingReader{err: copyErr},
		},
	}, nil)
	if !errors.Is(err, copyErr) {
		t.Fatalf("error = %v", err)
	}
}

func TestMultipartContextCancellationTerminatesCopy(t *testing.T) {
	ctx, cancel := context.WithCancel(t.Context())
	reader := &cancelReader{ctx: ctx, started: make(chan struct{})}
	client := testClient(t, roundTripperFunc(func(request *http.Request) (*http.Response, error) {
		_, err := io.Copy(io.Discard, request.Body)
		return nil, err
	}))
	done := make(chan error, 1)
	go func() {
		done <- client.Do(ctx, Request{
			Method: http.MethodPost,
			Path:   "/cancel",
			Multipart: &MultipartFileBody{
				FieldName: "file",
				FileName:  "fixture",
				Reader:    reader,
			},
		}, nil)
	}()
	<-reader.started
	cancel()
	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("error = %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("multipart copy goroutine did not terminate")
	}
}

func TestJSONBodylessRequestHasNoContentType(t *testing.T) {
	client := testClient(t, roundTripperFunc(func(request *http.Request) (*http.Response, error) {
		if value := request.Header.Get("Content-Type"); value != "" {
			t.Fatalf("content type = %q", value)
		}
		if request.Body != nil {
			t.Fatal("bodyless request has a body")
		}
		return jsonResponse(http.StatusOK, ""), nil
	}))
	if err := client.Do(t.Context(), Request{Method: http.MethodGet, Path: "/bodyless"}, nil); err != nil {
		t.Fatal(err)
	}
}

func TestNewRejectsInvalidOptionsBeforeNetworkAccess(t *testing.T) {
	tests := []struct {
		name string
		opts ClientOptions
	}{
		{name: "whitespace API key", opts: ClientOptions{APIKey: " \t\n"}},
		{name: "negative timeout", opts: ClientOptions{APIKey: "fixture", Timeout: -time.Second}},
		{name: "malformed URL", opts: ClientOptions{APIKey: "fixture", ServerURL: "https://[::1"}},
		{name: "relative URL", opts: ClientOptions{APIKey: "fixture", ServerURL: "/api"}},
		{name: "non-http URL", opts: ClientOptions{APIKey: "fixture", ServerURL: "ftp://example.test/api"}},
		{name: "URL without host", opts: ClientOptions{APIKey: "fixture", ServerURL: "https:///api"}},
		{name: "URL with query", opts: ClientOptions{APIKey: "fixture", ServerURL: "https://example.test/api?token=bad"}},
		{name: "URL with fragment", opts: ClientOptions{APIKey: "fixture", ServerURL: "https://example.test/api#fragment"}},
		{name: "remote plaintext URL", opts: ClientOptions{APIKey: "fixture", ServerURL: "http://example.test/api"}},
		{name: "URL with credentials", opts: ClientOptions{APIKey: "fixture", ServerURL: "https://user:pass@example.test/api"}},
		{name: "oversized response limit", opts: ClientOptions{APIKey: "fixture", MaxResponseBytes: MaxResponseBytes + 1}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if _, err := New(test.opts); err == nil {
				t.Fatal("New() succeeded")
			}
		})
	}
}

func TestNewPreservesAPIKeyAndCustomHTTPClient(t *testing.T) {
	custom := &http.Client{Timeout: 91 * time.Second}
	client, err := New(ClientOptions{
		APIKey:     "  exact-key  ",
		ServerURL:  "https://example.test/base/",
		Timeout:    7 * time.Second,
		HTTPClient: custom,
	})
	if err != nil {
		t.Fatal(err)
	}
	if client.APIKey() != "  exact-key  " {
		t.Fatalf("API key = %q", client.APIKey())
	}
	if client.http == custom || client.http.Timeout != 91*time.Second || client.http.CheckRedirect == nil {
		t.Fatal("custom HTTP client was not safely cloned")
	}
	if custom.CheckRedirect != nil {
		t.Fatal("caller-owned HTTP client was mutated")
	}
	if client.Timeout() != 7*time.Second {
		t.Fatalf("reported timeout = %s", client.Timeout())
	}
	if client.ServerURL() != "https://example.test/base" {
		t.Fatalf("server URL = %q", client.ServerURL())
	}
}

func TestNewAcceptsLiteralLoopbackHTTP(t *testing.T) {
	for _, serverURL := range []string{"http://localhost:1234", "http://127.0.0.42:1234", "http://[::1]:1234"} {
		if _, err := New(ClientOptions{APIKey: "fixture", ServerURL: serverURL}); err != nil {
			t.Fatalf("%s: %v", serverURL, err)
		}
	}
}

func TestClientNeverFollowsRedirectsOrForwardsAPIKey(t *testing.T) {
	destinationCalls := 0
	destination := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		destinationCalls++
	}))
	t.Cleanup(destination.Close)
	sourceCalls := 0
	source := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		sourceCalls++
		if request.Header.Get("X-API-Key") != "fixture" {
			t.Fatal("source did not receive API key")
		}
		http.Redirect(response, request, destination.URL, http.StatusTemporaryRedirect)
	}))
	t.Cleanup(source.Close)
	client, err := New(ClientOptions{APIKey: "fixture", ServerURL: source.URL})
	if err != nil {
		t.Fatal(err)
	}
	err = client.Do(t.Context(), Request{Method: http.MethodGet, Path: "/redirect"}, new(any))
	var apiErr *APIError
	if !errors.As(err, &apiErr) || apiErr.Status != http.StatusTemporaryRedirect {
		t.Fatalf("error = %T %v", err, err)
	}
	if sourceCalls != 1 || destinationCalls != 0 {
		t.Fatalf("source calls = %d, destination calls = %d", sourceCalls, destinationCalls)
	}
}

func TestClientBoundsSuccessAndErrorBodies(t *testing.T) {
	for _, status := range []int{http.StatusOK, http.StatusBadRequest} {
		client := testClient(t, roundTripperFunc(func(*http.Request) (*http.Response, error) {
			response := jsonResponse(status, "12345")
			response.ContentLength = 5
			return response, nil
		}))
		client.opts.MaxResponseBytes = 4
		var out any
		err := client.Do(t.Context(), Request{Method: http.MethodGet, Path: "/large"}, &out)
		var tooLarge *ResponseTooLargeError
		if !errors.As(err, &tooLarge) || tooLarge.Limit != 4 {
			t.Fatalf("status %d error = %T %v", status, err, err)
		}
	}
}

func TestDoJoinsConfiguredBasePath(t *testing.T) {
	var gotPath string
	client, err := New(ClientOptions{
		APIKey:    "fixture",
		ServerURL: "https://example.test/proxy/plaky/",
		HTTPClient: &http.Client{Transport: roundTripperFunc(func(request *http.Request) (*http.Response, error) {
			gotPath = request.URL.EscapedPath()
			return jsonResponse(http.StatusOK, `{}`), nil
		})},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := client.Do(t.Context(), Request{Method: http.MethodGet, Path: "/v1/public/items/a%2Fb"}, new(any)); err != nil {
		t.Fatal(err)
	}
	if gotPath != "/proxy/plaky/v1/public/items/a%2Fb" {
		t.Fatalf("request path = %q", gotPath)
	}
}

func TestDefaultServerURLRemainsUnchanged(t *testing.T) {
	client, err := New(ClientOptions{APIKey: "fixture"})
	if err != nil {
		t.Fatal(err)
	}
	if client.ServerURL() != DefaultServerURL {
		t.Fatalf("server URL = %q", client.ServerURL())
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

func jsonResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

type chunkTrackingReader struct {
	reader  io.Reader
	maxRead int
}

func (reader *chunkTrackingReader) Read(buffer []byte) (int, error) {
	if len(buffer) > reader.maxRead {
		reader.maxRead = len(buffer)
	}
	return reader.reader.Read(buffer)
}

type failingReader struct {
	err error
}

func (reader *failingReader) Read([]byte) (int, error) { return 0, reader.err }

type cancelReader struct {
	ctx     context.Context
	started chan struct{}
	once    sync.Once
}

func (reader *cancelReader) Read([]byte) (int, error) {
	reader.once.Do(func() { close(reader.started) })
	<-reader.ctx.Done()
	return 0, reader.ctx.Err()
}
