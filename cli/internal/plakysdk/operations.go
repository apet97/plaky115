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

// ListSpaces executes the listSpaces operation: GET /v1/public/spaces
func (c *Client) ListSpaces(ctx context.Context, opts ListSpacesOptions) (any, error) {
	if opts.Page != 0 && opts.Page < 1 {
		return nil, fmt.Errorf("listSpaces: page must be at least 1")
	}
	if opts.Page > 2147483647 {
		return nil, fmt.Errorf("listSpaces: page must be at most 2147483647")
	}
	if opts.PageSize != 0 && opts.PageSize < 1 {
		return nil, fmt.Errorf("listSpaces: pageSize must be at least 1")
	}
	path := "/v1/public/spaces"
	query := url.Values{}
	if len(opts.Expand) > 0 {
		query.Set("expand", strings.Join(opts.Expand, ","))
	}
	if opts.Page != 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize != 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("listSpaces", "paged-object", out, []string{"data", "hasMore"}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type ListSpacesOptions struct {
	Expand   []string
	Page     int
	PageSize int
}

// GetSpace executes the getSpace operation: GET /v1/public/spaces/{spaceId}
func (c *Client) GetSpace(ctx context.Context, opts GetSpaceOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll("/v1/public/spaces/{spaceId}", "{spaceId}", url.PathEscape(opts.SpaceId))
	query := url.Values{}
	if len(opts.Expand) > 0 {
		query.Set("expand", strings.Join(opts.Expand, ","))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("getSpace", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type GetSpaceOptions struct {
	SpaceId string
	Expand  []string
}

// ListBoards executes the listBoards operation: GET /v1/public/spaces/{spaceId}/boards
func (c *Client) ListBoards(ctx context.Context, opts ListBoardsOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if opts.Page != 0 && opts.Page < 1 {
		return nil, fmt.Errorf("listBoards: page must be at least 1")
	}
	if opts.Page > 2147483647 {
		return nil, fmt.Errorf("listBoards: page must be at most 2147483647")
	}
	if opts.PageSize != 0 && opts.PageSize < 1 {
		return nil, fmt.Errorf("listBoards: pageSize must be at least 1")
	}
	path := strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards", "{spaceId}", url.PathEscape(opts.SpaceId))
	query := url.Values{}
	if opts.Page != 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize != 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("listBoards", "paged-object", out, []string{"data", "hasMore"}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type ListBoardsOptions struct {
	SpaceId  string
	Page     int
	PageSize int
}

// GetBoard executes the getBoard operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}
func (c *Client) GetBoard(ctx context.Context, opts GetBoardOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("getBoard", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type GetBoardOptions struct {
	SpaceId string
	BoardId string
}

// ListItemGroups executes the listItemGroups operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups
func (c *Client) ListItemGroups(ctx context.Context, opts ListItemGroupsOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if opts.Page != 0 && opts.Page < 1 {
		return nil, fmt.Errorf("listItemGroups: page must be at least 1")
	}
	if opts.Page > 2147483647 {
		return nil, fmt.Errorf("listItemGroups: page must be at most 2147483647")
	}
	if opts.PageSize != 0 && opts.PageSize < 1 {
		return nil, fmt.Errorf("listItemGroups: pageSize must be at least 1")
	}
	path := strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/item-groups", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId))
	query := url.Values{}
	if opts.Page != 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize != 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("listItemGroups", "paged-object", out, []string{"data", "hasMore"}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type ListItemGroupsOptions struct {
	SpaceId  string
	BoardId  string
	Page     int
	PageSize int
}

// CreateItemGroup executes the createItemGroup operation: POST /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups
func (c *Client) CreateItemGroup(ctx context.Context, opts CreateItemGroupOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/item-groups", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId))
	req := Request{Method: "POST", Path: path}
	jsonBody := opts.JSONBody
	if jsonBody == nil {
		jsonBody = opts.Body
	}
	if err := ValidateJSONBody(jsonBody, true, "title", "color"); err != nil {
		return nil, err
	}
	req.JSONBody = jsonBody
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("createItemGroup", "json-object", out, []string{}, true, false); err != nil {
		return nil, err
	}
	return out, nil
}

type CreateItemGroupOptions struct {
	SpaceId  string
	BoardId  string
	JSONBody any
	// Body is retained for compatibility with curated CLI workflows.
	// Deprecated: use JSONBody.
	Body           any
	IdempotencyKey string
}

// DeleteItemGroup executes the deleteItemGroup operation: DELETE /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}
func (c *Client) DeleteItemGroup(ctx context.Context, opts DeleteItemGroupOptions) error {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.ItemGroupId); err != nil {
		return err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemGroupId}", url.PathEscape(opts.ItemGroupId))
	req := Request{Method: "DELETE", Path: path}
	return c.Do(ctx, req, nil)
}

type DeleteItemGroupOptions struct {
	SpaceId     string
	BoardId     string
	ItemGroupId string
}

// GetItemGroup executes the getItemGroup operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}
func (c *Client) GetItemGroup(ctx context.Context, opts GetItemGroupOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemGroupId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemGroupId}", url.PathEscape(opts.ItemGroupId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("getItemGroup", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type GetItemGroupOptions struct {
	SpaceId     string
	BoardId     string
	ItemGroupId string
}

// UpdateItemGroup executes the updateItemGroup operation: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}
func (c *Client) UpdateItemGroup(ctx context.Context, opts UpdateItemGroupOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemGroupId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemGroupId}", url.PathEscape(opts.ItemGroupId))
	req := Request{Method: "PUT", Path: path}
	jsonBody := opts.JSONBody
	if jsonBody == nil {
		jsonBody = opts.Body
	}
	if err := ValidateJSONBody(jsonBody, true, "title", "ranking", "color"); err != nil {
		return nil, err
	}
	req.JSONBody = jsonBody
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("updateItemGroup", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type UpdateItemGroupOptions struct {
	SpaceId     string
	BoardId     string
	ItemGroupId string
	JSONBody    any
	// Body is retained for compatibility with curated CLI workflows.
	// Deprecated: use JSONBody.
	Body           any
	IdempotencyKey string
}

// ArchiveItemGroup executes the archiveItemGroup operation: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}/archive
func (c *Client) ArchiveItemGroup(ctx context.Context, opts ArchiveItemGroupOptions) error {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.ItemGroupId); err != nil {
		return err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}/archive", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemGroupId}", url.PathEscape(opts.ItemGroupId))
	req := Request{Method: "PUT", Path: path}
	return c.Do(ctx, req, nil)
}

type ArchiveItemGroupOptions struct {
	SpaceId     string
	BoardId     string
	ItemGroupId string
}

// ListItems executes the listItems operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items
func (c *Client) ListItems(ctx context.Context, opts ListItemsOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if opts.Page != 0 && opts.Page < 1 {
		return nil, fmt.Errorf("listItems: page must be at least 1")
	}
	if opts.Page > 2147483647 {
		return nil, fmt.Errorf("listItems: page must be at most 2147483647")
	}
	if opts.PageSize != 0 && opts.PageSize < 1 {
		return nil, fmt.Errorf("listItems: pageSize must be at least 1")
	}
	path := strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId))
	query := url.Values{}
	if opts.BoardViewId != 0 {
		query.Set("boardViewId", fmt.Sprintf("%d", opts.BoardViewId))
	}
	if opts.ParentId != 0 {
		query.Set("parentId", fmt.Sprintf("%d", opts.ParentId))
	}
	if opts.SubitemsBehaviour != "" {
		query.Set("subitemsBehaviour", opts.SubitemsBehaviour)
	}
	if len(opts.Expand) > 0 {
		query.Set("expand", strings.Join(opts.Expand, ","))
	}
	if opts.Page != 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize != 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("listItems", "paged-object", out, []string{"data", "hasMore"}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type ListItemsOptions struct {
	SpaceId           string
	BoardId           string
	BoardViewId       int64
	ParentId          int64
	SubitemsBehaviour string
	Expand            []string
	Page              int
	PageSize          int
}

// CreateItem executes the createItem operation: POST /v1/public/spaces/{spaceId}/boards/{boardId}/items
func (c *Client) CreateItem(ctx context.Context, opts CreateItemOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId))
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
	if err := ValidateResponseShape("createItem", "json-object", out, []string{}, true, false); err != nil {
		return nil, err
	}
	return out, nil
}

type CreateItemOptions struct {
	SpaceId  string
	BoardId  string
	JSONBody any
	// Body is retained for compatibility with curated CLI workflows.
	// Deprecated: use JSONBody.
	Body           any
	IdempotencyKey string
}

// DeleteItem executes the deleteItem operation: DELETE /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}
func (c *Client) DeleteItem(ctx context.Context, opts DeleteItemOptions) error {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	req := Request{Method: "DELETE", Path: path}
	return c.Do(ctx, req, nil)
}

type DeleteItemOptions struct {
	SpaceId string
	BoardId string
	ItemId  string
}

// GetItem executes the getItem operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}
func (c *Client) GetItem(ctx context.Context, opts GetItemOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	query := url.Values{}
	if len(opts.Expand) > 0 {
		query.Set("expand", strings.Join(opts.Expand, ","))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("getItem", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type GetItemOptions struct {
	SpaceId string
	BoardId string
	ItemId  string
	Expand  []string
}

// ListItemComments executes the listItemComments operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments
func (c *Client) ListItemComments(ctx context.Context, opts ListItemCommentsOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("listItemComments", "json-array", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type ListItemCommentsOptions struct {
	SpaceId string
	BoardId string
	ItemId  string
}

// CreateItemComment executes the createItemComment operation: POST /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments
func (c *Client) CreateItemComment(ctx context.Context, opts CreateItemCommentOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	req := Request{Method: "POST", Path: path}
	jsonBody := opts.JSONBody
	if jsonBody == nil {
		jsonBody = opts.Body
	}
	if err := ValidateJSONBody(jsonBody, true, "text"); err != nil {
		return nil, err
	}
	req.JSONBody = jsonBody
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("createItemComment", "json-object", out, []string{}, true, false); err != nil {
		return nil, err
	}
	return out, nil
}

type CreateItemCommentOptions struct {
	SpaceId  string
	BoardId  string
	ItemId   string
	JSONBody any
	// Body is retained for compatibility with curated CLI workflows.
	// Deprecated: use JSONBody.
	Body           any
	IdempotencyKey string
}

// DeleteItemComment executes the deleteItemComment operation: DELETE /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}
func (c *Client) DeleteItemComment(ctx context.Context, opts DeleteItemCommentOptions) error {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.ItemCommentId); err != nil {
		return err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemCommentId}", url.PathEscape(opts.ItemCommentId))
	req := Request{Method: "DELETE", Path: path}
	return c.Do(ctx, req, nil)
}

type DeleteItemCommentOptions struct {
	SpaceId       string
	BoardId       string
	ItemId        string
	ItemCommentId string
}

// UpdateItemComment executes the updateItemComment operation: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}
func (c *Client) UpdateItemComment(ctx context.Context, opts UpdateItemCommentOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemCommentId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemCommentId}", url.PathEscape(opts.ItemCommentId))
	req := Request{Method: "PUT", Path: path}
	jsonBody := opts.JSONBody
	if jsonBody == nil {
		jsonBody = opts.Body
	}
	if err := ValidateJSONBody(jsonBody, true, "text"); err != nil {
		return nil, err
	}
	req.JSONBody = jsonBody
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("updateItemComment", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type UpdateItemCommentOptions struct {
	SpaceId       string
	BoardId       string
	ItemId        string
	ItemCommentId string
	JSONBody      any
	// Body is retained for compatibility with curated CLI workflows.
	// Deprecated: use JSONBody.
	Body           any
	IdempotencyKey string
}

// ReplaceCommentReactions executes the replaceCommentReactions operation: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}/reactions
func (c *Client) ReplaceCommentReactions(ctx context.Context, opts ReplaceCommentReactionsOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemCommentId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}/reactions", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemCommentId}", url.PathEscape(opts.ItemCommentId))
	req := Request{Method: "PUT", Path: path}
	jsonBody := opts.JSONBody
	if jsonBody == nil {
		jsonBody = opts.Body
	}
	if err := ValidateJSONBody(jsonBody, true, "reactions"); err != nil {
		return nil, err
	}
	req.JSONBody = jsonBody
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("replaceCommentReactions", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type ReplaceCommentReactionsOptions struct {
	SpaceId       string
	BoardId       string
	ItemId        string
	ItemCommentId string
	JSONBody      any
	// Body is retained for compatibility with curated CLI workflows.
	// Deprecated: use JSONBody.
	Body           any
	IdempotencyKey string
}

// UpdateItemFields executes the updateItemFields operation: PATCH /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields
func (c *Client) UpdateItemFields(ctx context.Context, opts UpdateItemFieldsOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	req := Request{Method: "PATCH", Path: path}
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
	if err := ValidateResponseShape("updateItemFields", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type UpdateItemFieldsOptions struct {
	SpaceId  string
	BoardId  string
	ItemId   string
	JSONBody any
	// Body is retained for compatibility with curated CLI workflows.
	// Deprecated: use JSONBody.
	Body           any
	IdempotencyKey string
}

// UpdateItemField executes the updateItemField operation: PATCH /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields/{itemFieldKey}
func (c *Client) UpdateItemField(ctx context.Context, opts UpdateItemFieldOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields/{itemFieldKey}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemFieldKey}", url.PathEscape(opts.ItemFieldKey))
	req := Request{Method: "PATCH", Path: path}
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
	if err := ValidateResponseShape("updateItemField", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type UpdateItemFieldOptions struct {
	SpaceId      string
	BoardId      string
	ItemId       string
	ItemFieldKey string
	JSONBody     any
	// Body is retained for compatibility with curated CLI workflows.
	// Deprecated: use JSONBody.
	Body           any
	IdempotencyKey string
}

// ListItemFiles executes the listItemFiles operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files
func (c *Client) ListItemFiles(ctx context.Context, opts ListItemFilesOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("listItemFiles", "json-array", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type ListItemFilesOptions struct {
	SpaceId string
	BoardId string
	ItemId  string
}

// UploadItemFile executes the uploadItemFile operation: POST /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files
func (c *Client) UploadItemFile(ctx context.Context, opts UploadItemFileOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	req := Request{Method: "POST", Path: path}
	req.Multipart = opts.Multipart
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("uploadItemFile", "json-object", out, []string{}, true, false); err != nil {
		return nil, err
	}
	return out, nil
}

type UploadItemFileOptions struct {
	SpaceId        string
	BoardId        string
	ItemId         string
	Multipart      *MultipartFileBody
	IdempotencyKey string
}

// DeleteItemFile executes the deleteItemFile operation: DELETE /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}
func (c *Client) DeleteItemFile(ctx context.Context, opts DeleteItemFileOptions) error {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return err
	}
	if _, err := CanonicalInt64ID(opts.ItemFileId); err != nil {
		return err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemFileId}", url.PathEscape(opts.ItemFileId))
	req := Request{Method: "DELETE", Path: path}
	return c.Do(ctx, req, nil)
}

type DeleteItemFileOptions struct {
	SpaceId    string
	BoardId    string
	ItemId     string
	ItemFileId string
}

// GetItemFile executes the getItemFile operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}
func (c *Client) GetItemFile(ctx context.Context, opts GetItemFileOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemFileId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemFileId}", url.PathEscape(opts.ItemFileId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("getItemFile", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type GetItemFileOptions struct {
	SpaceId    string
	BoardId    string
	ItemId     string
	ItemFileId string
}

// UpdateItemFile executes the updateItemFile operation: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}
func (c *Client) UpdateItemFile(ctx context.Context, opts UpdateItemFileOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemFileId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemFileId}", url.PathEscape(opts.ItemFileId))
	req := Request{Method: "PUT", Path: path}
	jsonBody := opts.JSONBody
	if jsonBody == nil {
		jsonBody = opts.Body
	}
	if err := ValidateJSONBody(jsonBody, true, "name"); err != nil {
		return nil, err
	}
	req.JSONBody = jsonBody
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("updateItemFile", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type UpdateItemFileOptions struct {
	SpaceId    string
	BoardId    string
	ItemId     string
	ItemFileId string
	JSONBody   any
	// Body is retained for compatibility with curated CLI workflows.
	// Deprecated: use JSONBody.
	Body           any
	IdempotencyKey string
}

// GetItemFileDownload executes the getItemFileDownload operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}/download
func (c *Client) GetItemFileDownload(ctx context.Context, opts GetItemFileDownloadOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemFileId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}/download", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemFileId}", url.PathEscape(opts.ItemFileId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("getItemFileDownload", "json-object", out, []string{}, false, true); err != nil {
		return nil, err
	}
	return out, nil
}

type GetItemFileDownloadOptions struct {
	SpaceId    string
	BoardId    string
	ItemId     string
	ItemFileId string
}

// ListSubitems executes the listSubitems operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/sub-items
func (c *Client) ListSubitems(ctx context.Context, opts ListSubitemsOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.SpaceId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.BoardId); err != nil {
		return nil, err
	}
	if _, err := CanonicalInt64ID(opts.ItemId); err != nil {
		return nil, err
	}
	if opts.Page != 0 && opts.Page < 1 {
		return nil, fmt.Errorf("listSubitems: page must be at least 1")
	}
	if opts.Page > 2147483647 {
		return nil, fmt.Errorf("listSubitems: page must be at most 2147483647")
	}
	if opts.PageSize != 0 && opts.PageSize < 1 {
		return nil, fmt.Errorf("listSubitems: pageSize must be at least 1")
	}
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/sub-items", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	query := url.Values{}
	if len(opts.Expand) > 0 {
		query.Set("expand", strings.Join(opts.Expand, ","))
	}
	if opts.Page != 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize != 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("listSubitems", "paged-object", out, []string{"data", "hasMore"}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type ListSubitemsOptions struct {
	SpaceId  string
	BoardId  string
	ItemId   string
	Expand   []string
	Page     int
	PageSize int
}

// ListTeams executes the listTeams operation: GET /v1/public/teams
func (c *Client) ListTeams(ctx context.Context, opts ListTeamsOptions) (any, error) {
	if opts.Page != 0 && opts.Page < 1 {
		return nil, fmt.Errorf("listTeams: page must be at least 1")
	}
	if opts.Page > 2147483647 {
		return nil, fmt.Errorf("listTeams: page must be at most 2147483647")
	}
	if opts.PageSize != 0 && opts.PageSize < 1 {
		return nil, fmt.Errorf("listTeams: pageSize must be at least 1")
	}
	path := "/v1/public/teams"
	query := url.Values{}
	if opts.Page != 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize != 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("listTeams", "paged-object", out, []string{"data", "hasMore"}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type ListTeamsOptions struct {
	Page     int
	PageSize int
}

// GetTeam executes the getTeam operation: GET /v1/public/teams/{teamId}
func (c *Client) GetTeam(ctx context.Context, opts GetTeamOptions) (any, error) {
	if _, err := CanonicalInt64ID(opts.TeamId); err != nil {
		return nil, err
	}
	path := strings.ReplaceAll("/v1/public/teams/{teamId}", "{teamId}", url.PathEscape(opts.TeamId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("getTeam", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type GetTeamOptions struct {
	TeamId string
}

// ListUsers executes the listUsers operation: GET /v1/public/users
func (c *Client) ListUsers(ctx context.Context, opts ListUsersOptions) (any, error) {
	if opts.Page != 0 && opts.Page < 1 {
		return nil, fmt.Errorf("listUsers: page must be at least 1")
	}
	if opts.Page > 2147483647 {
		return nil, fmt.Errorf("listUsers: page must be at most 2147483647")
	}
	if opts.PageSize != 0 && opts.PageSize < 1 {
		return nil, fmt.Errorf("listUsers: pageSize must be at least 1")
	}
	path := "/v1/public/users"
	query := url.Values{}
	for _, value := range opts.Emails {
		query.Add("emails", value)
	}
	if opts.Status != "" {
		query.Set("status", opts.Status)
	}
	if opts.Type != "" {
		query.Set("type", opts.Type)
	}
	if opts.Page != 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize != 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("listUsers", "paged-object", out, []string{"data", "hasMore"}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type ListUsersOptions struct {
	Emails   []string
	Status   string
	Type     string
	Page     int
	PageSize int
}

// GetCurrentUser executes the getCurrentUser operation: GET /v1/public/users/me
func (c *Client) GetCurrentUser(ctx context.Context, opts GetCurrentUserOptions) (any, error) {
	path := "/v1/public/users/me"
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	if err := ValidateResponseShape("getCurrentUser", "json-object", out, []string{}, false, false); err != nil {
		return nil, err
	}
	return out, nil
}

type GetCurrentUserOptions struct {
}
