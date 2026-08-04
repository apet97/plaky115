// Package plakysdk is the hand-crafted Go client for the Plaky public API.
// Generated operation methods live in operations.go.
package plakysdk

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net"
	"net/http"
	"net/textproto"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	DefaultServerURL        = "https://api.plaky.com"
	DefaultMaxResponseBytes = int64(16 * 1024 * 1024)
	MaxResponseBytes        = int64(64 * 1024 * 1024)
)

type ClientOptions struct {
	APIKey           string
	ServerURL        string
	Timeout          time.Duration
	UserAgent        string
	HTTPClient       *http.Client
	MaxResponseBytes int64
}

type Client struct {
	opts    ClientOptions
	http    *http.Client
	baseURL *url.URL
}

func New(opts ClientOptions) (*Client, error) {
	if strings.TrimSpace(opts.APIKey) == "" {
		return nil, fmt.Errorf("plakysdk: APIKey required")
	}
	if opts.Timeout < 0 {
		return nil, fmt.Errorf("plakysdk: Timeout must be non-negative")
	}
	if opts.ServerURL == "" {
		opts.ServerURL = DefaultServerURL
	}
	baseURL, err := url.Parse(opts.ServerURL)
	if err != nil {
		return nil, fmt.Errorf("plakysdk: invalid ServerURL: %w", err)
	}
	if (baseURL.Scheme != "http" && baseURL.Scheme != "https") || baseURL.Host == "" || !baseURL.IsAbs() {
		return nil, fmt.Errorf("plakysdk: ServerURL must be an absolute http or https URL")
	}
	if baseURL.Scheme == "http" && !isLoopbackHost(baseURL.Hostname()) {
		return nil, fmt.Errorf("plakysdk: ServerURL must use https except for a literal loopback host")
	}
	if baseURL.User != nil {
		return nil, fmt.Errorf("plakysdk: ServerURL must not include credentials")
	}
	if baseURL.RawQuery != "" || baseURL.ForceQuery || baseURL.Fragment != "" {
		return nil, fmt.Errorf("plakysdk: ServerURL must not include a query or fragment")
	}
	baseURL.Path = strings.TrimRight(baseURL.Path, "/")
	baseURL.RawPath = strings.TrimRight(baseURL.RawPath, "/")
	opts.ServerURL = baseURL.String()
	if opts.Timeout == 0 {
		opts.Timeout = 30 * time.Second
	}
	if opts.UserAgent == "" {
		opts.UserAgent = "plaky115-cli"
	}
	if opts.MaxResponseBytes == 0 {
		opts.MaxResponseBytes = DefaultMaxResponseBytes
	}
	if opts.MaxResponseBytes < 0 || opts.MaxResponseBytes > MaxResponseBytes {
		return nil, fmt.Errorf("plakysdk: MaxResponseBytes must be between 1 and %d", MaxResponseBytes)
	}
	hc := opts.HTTPClient
	if hc == nil {
		hc = &http.Client{Timeout: opts.Timeout}
	}
	clone := *hc
	clone.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	return &Client{opts: opts, http: &clone, baseURL: baseURL}, nil
}

type Request struct {
	Method    string
	Path      string
	Query     url.Values
	JSONBody  any
	Multipart *MultipartFileBody
	// Body is retained only until the tracked generated operations migrate to JSONBody in O004.
	// Deprecated: use JSONBody.
	Body        any
	Idempotency string
}

type MultipartFileBody struct {
	FieldName   string
	FileName    string
	ContentType string
	Reader      io.Reader
}

// ValidateJSONBody enforces the normalized request-root contract before any
// HTTP request is built. Open objects remain open; only the evidenced required
// properties are checked here.
func ValidateJSONBody(body any, required bool, requiredProperties ...string) error {
	if body == nil {
		if required {
			return fmt.Errorf("JSON body is required")
		}
		return nil
	}
	record, ok := body.(map[string]any)
	if !ok {
		return fmt.Errorf("JSON body must be a JSON object")
	}
	for _, property := range requiredProperties {
		if _, present := record[property]; !present {
			return fmt.Errorf("JSON body property %q is required", property)
		}
	}
	return nil
}

// ValidateResponseShape checks only the narrow root semantics owned by the
// operation descriptor. Component-level validation remains outside the CLI.
func ValidateResponseShape(operationID, kind string, value any, requiredProperties []string, createdID, sensitiveLink bool) error {
	if kind == "json-array" {
		if _, ok := value.([]any); !ok {
			return fmt.Errorf("%s: response must be an array", operationID)
		}
		return nil
	}
	if kind != "json-object" && kind != "paged-object" {
		return fmt.Errorf("%s: unsupported response kind %q", operationID, kind)
	}
	record, ok := value.(map[string]any)
	if !ok {
		return fmt.Errorf("%s: response must be an object", operationID)
	}
	for _, property := range requiredProperties {
		if _, present := record[property]; !present {
			return fmt.Errorf("%s: response property %q is required", operationID, property)
		}
	}
	if kind == "paged-object" {
		data, dataOK := record["data"].([]any)
		hasMore, hasMoreOK := record["hasMore"].(bool)
		if !dataOK || !hasMoreOK {
			return fmt.Errorf("%s: response must contain array data and boolean hasMore", operationID)
		}
		if len(data) == 0 && hasMore {
			return fmt.Errorf("%s: empty page cannot advertise more results", operationID)
		}
	}
	if createdID {
		if id, present := record["id"]; !present || id == nil {
			return fmt.Errorf("%s: response property \"id\" is required", operationID)
		}
	}
	if sensitiveLink {
		urlValue, ok := record["url"].(string)
		if !ok || !strings.HasPrefix(urlValue, "https://") {
			return fmt.Errorf("%s: response url must use HTTPS", operationID)
		}
		if expiry, present := record["expiresInSeconds"]; present {
			switch value := expiry.(type) {
			case json.Number:
				if strings.HasPrefix(value.String(), "-") {
					return fmt.Errorf("%s: response expiry must be non-negative", operationID)
				}
			case float64:
				if value < 0 {
					return fmt.Errorf("%s: response expiry must be non-negative", operationID)
				}
			default:
				return fmt.Errorf("%s: response expiry must be numeric", operationID)
			}
		}
	}
	return nil
}

func (c *Client) Do(ctx context.Context, req Request, out any) error {
	u, err := c.requestURL(req.Path)
	if err != nil {
		return operationError(req, "build request URL", err)
	}
	if req.Query != nil {
		u.RawQuery = req.Query.Encode()
	}
	body, contentType, startBody, bodyDone, err := prepareRequestBody(ctx, req)
	if err != nil {
		return operationError(req, "prepare request body", err)
	}
	httpReq, err := http.NewRequestWithContext(ctx, req.Method, u.String(), body)
	if err != nil {
		return err
	}
	httpReq.Header.Set("X-API-Key", c.opts.APIKey)
	httpReq.Header.Set("Accept", "application/json")
	if contentType != "" {
		httpReq.Header.Set("Content-Type", contentType)
	}
	if req.Idempotency != "" {
		httpReq.Header.Set("Idempotency-Key", req.Idempotency)
	}
	httpReq.Header.Set("User-Agent", c.opts.UserAgent)

	if startBody != nil {
		startBody()
	}
	resp, sendErr := c.http.Do(httpReq)
	if body != nil {
		_ = body.Close()
	}
	var streamErr error
	if bodyDone != nil {
		streamErr = <-bodyDone
	}
	if streamErr != nil && !(sendErr != nil && errors.Is(streamErr, io.ErrClosedPipe)) {
		return operationError(req, "write request body", streamErr)
	}
	if sendErr != nil {
		return operationError(req, "send request", sendErr)
	}
	defer resp.Body.Close()
	raw, err := readResponseBody(resp.Body, resp.ContentLength, c.opts.MaxResponseBytes)
	if err != nil {
		return operationError(req, "read response body", err)
	}
	if resp.StatusCode >= 300 {
		return decodeError(resp.StatusCode, raw, resp.Header.Get("X-Request-ID"))
	}
	if len(raw) == 0 || out == nil {
		return nil
	}
	if err := decodeResponse(raw, out); err != nil {
		return operationError(req, "decode response body", err)
	}
	return nil
}

func (c *Client) requestURL(operationPath string) (*url.URL, error) {
	operationURL, err := url.Parse(operationPath)
	if err != nil {
		return nil, err
	}
	if operationURL.IsAbs() || operationURL.Host != "" || operationURL.RawQuery != "" || operationURL.ForceQuery || operationURL.Fragment != "" {
		return nil, fmt.Errorf("operation path must not be an absolute URL, query, or fragment")
	}

	joinedEscapedPath := strings.TrimRight(c.baseURL.EscapedPath(), "/") + "/" + strings.TrimLeft(operationURL.EscapedPath(), "/")
	joinedPath, err := url.PathUnescape(joinedEscapedPath)
	if err != nil {
		return nil, fmt.Errorf("invalid operation path: %w", err)
	}
	target := *c.baseURL
	target.Path = joinedPath
	target.RawPath = ""
	if joinedEscapedPath != joinedPath {
		target.RawPath = joinedEscapedPath
	}
	return &target, nil
}

func prepareRequestBody(
	ctx context.Context,
	req Request,
) (io.ReadCloser, string, func(), <-chan error, error) {
	jsonBody := req.JSONBody
	if req.Body != nil {
		if jsonBody != nil {
			return nil, "", nil, nil, fmt.Errorf("Body and JSONBody are mutually exclusive")
		}
		jsonBody = req.Body
	}
	if jsonBody != nil && req.Multipart != nil {
		return nil, "", nil, nil, fmt.Errorf("JSONBody and Multipart are mutually exclusive")
	}
	if jsonBody != nil {
		encoded, err := json.Marshal(jsonBody)
		if err != nil {
			return nil, "", nil, nil, err
		}
		return io.NopCloser(bytes.NewReader(encoded)), "application/json", nil, nil, nil
	}
	if req.Multipart == nil {
		return nil, "", nil, nil, nil
	}
	return prepareMultipartBody(ctx, req.Multipart)
}

func prepareMultipartBody(
	ctx context.Context,
	body *MultipartFileBody,
) (io.ReadCloser, string, func(), <-chan error, error) {
	if body.Reader == nil {
		return nil, "", nil, nil, fmt.Errorf("multipart reader is required")
	}
	fieldName := body.FieldName
	if fieldName == "" {
		fieldName = "file"
	}
	if body.FileName == "" {
		return nil, "", nil, nil, fmt.Errorf("multipart filename is required")
	}
	contentType := body.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	pipeReader, pipeWriter := io.Pipe()
	writer := multipart.NewWriter(pipeWriter)
	formContentType := writer.FormDataContentType()
	done := make(chan error, 1)
	start := func() {
		go func() {
			header := make(textproto.MIMEHeader)
			header.Set("Content-Disposition", mime.FormatMediaType("form-data", map[string]string{
				"name":     fieldName,
				"filename": body.FileName,
			}))
			header.Set("Content-Type", contentType)
			part, err := writer.CreatePart(header)
			if err == nil {
				_, err = io.Copy(part, &contextReader{ctx: ctx, reader: body.Reader})
			}
			if err == nil {
				err = writer.Close()
			}
			if err != nil {
				_ = pipeWriter.CloseWithError(err)
			} else {
				err = pipeWriter.Close()
			}
			done <- err
		}()
	}
	return pipeReader, formContentType, start, done, nil
}

type contextReader struct {
	ctx    context.Context
	reader io.Reader
}

func (reader *contextReader) Read(buffer []byte) (int, error) {
	select {
	case <-reader.ctx.Done():
		return 0, reader.ctx.Err()
	default:
		return reader.reader.Read(buffer)
	}
}

type ResponseTooLargeError struct {
	Limit int64
}

func (e *ResponseTooLargeError) Error() string {
	return fmt.Sprintf("plakysdk: response exceeds the %d-byte buffer limit", e.Limit)
}

func readResponseBody(body io.Reader, contentLength, limit int64) ([]byte, error) {
	if contentLength > limit {
		return nil, &ResponseTooLargeError{Limit: limit}
	}
	raw, err := io.ReadAll(io.LimitReader(body, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(raw)) > limit {
		return nil, &ResponseTooLargeError{Limit: limit}
	}
	return raw, nil
}

func isLoopbackHost(host string) bool {
	if strings.EqualFold(host, "localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func decodeResponse(raw []byte, out any) error {
	decoder := json.NewDecoder(strings.NewReader(string(raw)))
	decoder.UseNumber()
	if err := decoder.Decode(out); err != nil {
		return err
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		if err == nil {
			return fmt.Errorf("trailing JSON value")
		}
		return fmt.Errorf("trailing JSON: %w", err)
	}
	normalizeSafeJSONNumbers(out)
	return nil
}

func normalizeSafeJSONNumbers(out any) {
	switch target := out.(type) {
	case *any:
		*target = normalizeSafeJSONNumberValue(*target)
	case *map[string]any:
		for key, value := range *target {
			(*target)[key] = normalizeSafeJSONNumberValue(value)
		}
	case *[]any:
		for index, value := range *target {
			(*target)[index] = normalizeSafeJSONNumberValue(value)
		}
	}
}

func normalizeSafeJSONNumberValue(value any) any {
	switch typed := value.(type) {
	case json.Number:
		if strings.ContainsAny(typed.String(), ".eE") {
			if parsed, err := typed.Float64(); err == nil {
				return parsed
			}
			return typed
		}
		if parsed, err := typed.Int64(); err == nil && parsed > -(1<<53) && parsed < 1<<53 {
			return float64(parsed)
		}
		return typed
	case map[string]any:
		for key, child := range typed {
			typed[key] = normalizeSafeJSONNumberValue(child)
		}
		return typed
	case []any:
		for index, child := range typed {
			typed[index] = normalizeSafeJSONNumberValue(child)
		}
		return typed
	default:
		return value
	}
}

func operationError(req Request, action string, err error) error {
	return fmt.Errorf("%s %s: %s: %w", req.Method, req.Path, action, err)
}

func (c *Client) ServerURL() string { return c.opts.ServerURL }
func (c *Client) APIKey() string    { return c.opts.APIKey }

func CanonicalInt64ID(value string) (string, error) {
	parsed, err := strconv.ParseUint(value, 10, 63)
	if err != nil || strconv.FormatUint(parsed, 10) != value {
		return "", fmt.Errorf("invalid non-negative int64 ID %q", value)
	}
	return value, nil
}
func (c *Client) Timeout() time.Duration {
	return c.opts.Timeout
}
func (c *Client) UserAgent() string { return c.opts.UserAgent }
