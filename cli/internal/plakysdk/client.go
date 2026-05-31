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
		opts.UserAgent = "plaky115-cli/0.1.0"
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
		return err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return decodeError(resp.StatusCode, raw, resp.Header.Get("X-Request-ID"))
	}
	if len(raw) == 0 || out == nil {
		return nil
	}
	return json.Unmarshal(raw, out)
}

func (c *Client) ServerURL() string { return c.opts.ServerURL }
func (c *Client) APIKey() string    { return c.opts.APIKey }
func (c *Client) Timeout() time.Duration {
	return c.opts.Timeout
}
func (c *Client) UserAgent() string { return c.opts.UserAgent }
