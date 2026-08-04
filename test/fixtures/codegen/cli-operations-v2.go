// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json
// Regenerate: npm run generate:cli
package plakysdk

import (
	"context"
	"fmt"
	"net/url"
	"strings"
)

var _ = context.Background
var _ = fmt.Sprintf
var _ = url.Values{}
var _ = strings.NewReader

// GetWidget executes the getWidget operation: GET /v1/widgets/{widgetId}
func (c *Client) GetWidget(ctx context.Context, opts GetWidgetOptions) (any, error) {
	path := strings.ReplaceAll("/v1/widgets/{widgetId}", "{widgetId}", url.PathEscape(opts.WidgetId))
	query := url.Values{}
	if opts.Status != "" {
		query.Set("status", opts.Status)
	}
	if opts.Limit != 0 {
		query.Set("limit", fmt.Sprintf("%d", opts.Limit))
	}
	if opts.Cursor != 0 {
		query.Set("cursor", fmt.Sprintf("%d", opts.Cursor))
	}
	for _, value := range opts.Labels {
		query.Add("labels", value)
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("getWidget", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type GetWidgetOptions struct {
	WidgetId string
	Status   string
	Limit    int
	Cursor   int64
	Labels   []string
}

// CreateWidget executes the createWidget operation: POST /v1/widgets
func (c *Client) CreateWidget(ctx context.Context, opts CreateWidgetOptions) (any, error) {
	path := "/v1/widgets"
	req := Request{Method: "POST", Path: path}
	jsonBody := opts.JSONBody
	if jsonBody == nil {
		jsonBody = opts.Body
	}
	if err := ValidateJSONBody(jsonBody, true); err != nil {
		return nil, err
	}
	req.JSONBody = jsonBody
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("createWidget", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type CreateWidgetOptions struct {
	JSONBody any
	// Body is retained for compatibility with curated CLI workflows.
	// Deprecated: use JSONBody.
	Body           any
	IdempotencyKey string
}

// ArchiveWidget executes the archiveWidget operation: PUT /v1/widgets/{widgetId}/archive
func (c *Client) ArchiveWidget(ctx context.Context, opts ArchiveWidgetOptions) error {
	path := strings.ReplaceAll("/v1/widgets/{widgetId}/archive", "{widgetId}", url.PathEscape(opts.WidgetId))
	req := Request{Method: "PUT", Path: path}
	return c.Do(ctx, req, nil)
}

type ArchiveWidgetOptions struct {
	WidgetId string
}

// UploadWidgetFile executes the uploadWidgetFile operation: POST /v1/widgets/{widgetId}/files
func (c *Client) UploadWidgetFile(ctx context.Context, opts UploadWidgetFileOptions) (any, error) {
	path := strings.ReplaceAll("/v1/widgets/{widgetId}/files", "{widgetId}", url.PathEscape(opts.WidgetId))
	req := Request{Method: "POST", Path: path}
	req.Multipart = opts.Multipart
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("uploadWidgetFile", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type UploadWidgetFileOptions struct {
	WidgetId       string
	Multipart      *MultipartFileBody
	IdempotencyKey string
}

// DeleteWidget executes the deleteWidget operation: DELETE /v1/widgets/{widgetId}
func (c *Client) DeleteWidget(ctx context.Context, opts DeleteWidgetOptions) error {
	path := strings.ReplaceAll("/v1/widgets/{widgetId}", "{widgetId}", url.PathEscape(opts.WidgetId))
	req := Request{Method: "DELETE", Path: path}
	return c.Do(ctx, req, nil)
}

type DeleteWidgetOptions struct {
	WidgetId string
}
