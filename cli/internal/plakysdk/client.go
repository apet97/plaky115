// Package plakysdk is the hand-crafted Go client for the Plaky public API.
// Generated operation methods live in operations.go.
package plakysdk

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
	Method      string
	Path        string
	Query       url.Values
	Body        any
	Idempotency string
}

func (c *Client) Do(ctx context.Context, req Request, out any) error {
	u, err := url.Parse(strings.TrimRight(c.opts.ServerURL, "/") + req.Path)
	if err != nil {
		return err
	}
	if req.Query != nil {
		u.RawQuery = req.Query.Encode()
	}
	var body io.Reader
	if req.Body != nil {
		b, err := json.Marshal(req.Body)
		if err != nil {
			return err
		}
		body = strings.NewReader(string(b))
	}
	httpReq, err := http.NewRequestWithContext(ctx, req.Method, u.String(), body)
	if err != nil {
		return err
	}
	httpReq.Header.Set("X-API-Key", c.opts.APIKey)
	httpReq.Header.Set("Accept", "application/json")
	if req.Body != nil {
		httpReq.Header.Set("Content-Type", "application/json")
	}
	if req.Idempotency != "" {
		httpReq.Header.Set("Idempotency-Key", req.Idempotency)
	}
	httpReq.Header.Set("User-Agent", c.opts.UserAgent)

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return operationError(req, "send request", err)
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
