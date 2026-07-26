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
	"net/http"
	"net/textproto"
	"net/url"
	"strings"
	"time"
)

const DefaultServerURL = "https://api.plaky.com"

type ClientOptions struct {
	APIKey     string
	ServerURL  string
	Timeout    time.Duration
	UserAgent  string
	HTTPClient *http.Client
}

type Client struct {
	opts ClientOptions
	http *http.Client
}

func New(opts ClientOptions) (*Client, error) {
	if opts.APIKey == "" {
		return nil, fmt.Errorf("plakysdk: APIKey required")
	}
	if opts.ServerURL == "" {
		opts.ServerURL = DefaultServerURL
	}
	if opts.Timeout == 0 {
		opts.Timeout = 30 * time.Second
	}
	if opts.UserAgent == "" {
		opts.UserAgent = "plaky115-cli"
	}
	hc := opts.HTTPClient
	if hc == nil {
		hc = &http.Client{Timeout: opts.Timeout}
	}
	return &Client{opts: opts, http: hc}, nil
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

func (c *Client) Do(ctx context.Context, req Request, out any) error {
	u, err := url.Parse(strings.TrimRight(c.opts.ServerURL, "/") + req.Path)
	if err != nil {
		return err
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
	raw, err := readResponseBody(resp.Body)
	if err != nil {
		return operationError(req, "read response body", err)
	}
	if resp.StatusCode >= 400 {
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

func readResponseBody(body io.Reader) ([]byte, error) {
	return io.ReadAll(body)
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
		if parsed, err := typed.Int64(); err == nil && parsed >= -(1<<53) && parsed <= 1<<53 {
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
func (c *Client) Timeout() time.Duration {
	return c.opts.Timeout
}
func (c *Client) UserAgent() string { return c.opts.UserAgent }
