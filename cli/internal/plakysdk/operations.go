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
	path := "/v1/public/spaces"
	query := url.Values{}
	if opts.Page > 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize > 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type ListSpacesOptions struct {
	Page     int
	PageSize int
}

// ListTeams executes the listTeams operation: GET /v1/public/teams
func (c *Client) ListTeams(ctx context.Context, opts ListTeamsOptions) (any, error) {
	path := "/v1/public/teams"
	query := url.Values{}
	if opts.Page > 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize > 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type ListTeamsOptions struct {
	Page     int
	PageSize int
}

// ListUsers executes the listUsers operation: GET /v1/public/users
func (c *Client) ListUsers(ctx context.Context, opts ListUsersOptions) (any, error) {
	path := "/v1/public/users"
	query := url.Values{}
	if opts.Page > 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize > 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type ListUsersOptions struct {
	Page     int
	PageSize int
}

// ListBoards executes the listBoards operation: GET /v1/public/spaces/{spaceId}/boards
func (c *Client) ListBoards(ctx context.Context, opts ListBoardsOptions) (any, error) {
	path := strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards", "{spaceId}", url.PathEscape(opts.SpaceId))
	query := url.Values{}
	if opts.Page > 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize > 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type ListBoardsOptions struct {
	SpaceId  string
	Page     int
	PageSize int
}

// ListItems executes the listItems operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items
func (c *Client) ListItems(ctx context.Context, opts ListItemsOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId))
	query := url.Values{}
	if opts.Page > 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize > 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type ListItemsOptions struct {
	SpaceId  string
	BoardId  string
	Page     int
	PageSize int
}

// CreateItem executes the createItem operation: POST /v1/public/spaces/{spaceId}/boards/{boardId}/items
func (c *Client) CreateItem(ctx context.Context, opts CreateItemOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId))
	req := Request{Method: "POST", Path: path}
	req.Body = opts.Body
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type CreateItemOptions struct {
	SpaceId        string
	BoardId        string
	Body           any
	IdempotencyKey string
}

// GetSpace executes the getSpace operation: GET /v1/public/spaces/{spaceId}
func (c *Client) GetSpace(ctx context.Context, opts GetSpaceOptions) (any, error) {
	path := strings.ReplaceAll("/v1/public/spaces/{spaceId}", "{spaceId}", url.PathEscape(opts.SpaceId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type GetSpaceOptions struct {
	SpaceId string
}

// GetTeam executes the getTeam operation: GET /v1/public/teams/{teamId}
func (c *Client) GetTeam(ctx context.Context, opts GetTeamOptions) (any, error) {
	path := strings.ReplaceAll("/v1/public/teams/{teamId}", "{teamId}", url.PathEscape(opts.TeamId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type GetTeamOptions struct {
	TeamId string
}

// GetCurrentUser executes the getCurrentUser operation: GET /v1/public/users/me
func (c *Client) GetCurrentUser(ctx context.Context, opts GetCurrentUserOptions) (any, error) {
	path := "/v1/public/users/me"
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type GetCurrentUserOptions struct {
}

// GetBoard executes the getBoard operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}
func (c *Client) GetBoard(ctx context.Context, opts GetBoardOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type GetBoardOptions struct {
	SpaceId string
	BoardId string
}

// ListSubitems executes the listSubitems operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/sub-items
func (c *Client) ListSubitems(ctx context.Context, opts ListSubitemsOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/sub-items", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	query := url.Values{}
	if opts.Page > 0 {
		query.Set("page", fmt.Sprintf("%d", opts.Page))
	}
	if opts.PageSize > 0 {
		query.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))
	}
	req := Request{Method: "GET", Path: path}
	req.Query = query
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type ListSubitemsOptions struct {
	SpaceId  string
	BoardId  string
	ItemId   string
	Page     int
	PageSize int
}

// GetItem executes the getItem operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}
func (c *Client) GetItem(ctx context.Context, opts GetItemOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type GetItemOptions struct {
	SpaceId string
	BoardId string
	ItemId  string
}

// DeleteItem executes the deleteItem operation: DELETE /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}
func (c *Client) DeleteItem(ctx context.Context, opts DeleteItemOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	req := Request{Method: "DELETE", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type DeleteItemOptions struct {
	SpaceId string
	BoardId string
	ItemId  string
}

// UpdateItemField executes the updateItemField operation: PATCH /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields/{itemFieldKey}
func (c *Client) UpdateItemField(ctx context.Context, opts UpdateItemFieldOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields/{itemFieldKey}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemFieldKey}", url.PathEscape(opts.ItemFieldKey))
	req := Request{Method: "PATCH", Path: path}
	req.Body = opts.Body
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type UpdateItemFieldOptions struct {
	SpaceId        string
	BoardId        string
	ItemId         string
	ItemFieldKey   string
	Body           any
	IdempotencyKey string
}

// UpdateItemFields executes the updateItemFields operation: PATCH /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields
func (c *Client) UpdateItemFields(ctx context.Context, opts UpdateItemFieldsOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	req := Request{Method: "PATCH", Path: path}
	req.Body = opts.Body
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type UpdateItemFieldsOptions struct {
	SpaceId        string
	BoardId        string
	ItemId         string
	Body           any
	IdempotencyKey string
}

// ListItemComments executes the listItemComments operation: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments
func (c *Client) ListItemComments(ctx context.Context, opts ListItemCommentsOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	req := Request{Method: "GET", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
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
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId))
	req := Request{Method: "POST", Path: path}
	req.Body = opts.Body
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type CreateItemCommentOptions struct {
	SpaceId        string
	BoardId        string
	ItemId         string
	Body           any
	IdempotencyKey string
}

// UpdateItemComment executes the updateItemComment operation: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}
func (c *Client) UpdateItemComment(ctx context.Context, opts UpdateItemCommentOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemCommentId}", url.PathEscape(opts.ItemCommentId))
	req := Request{Method: "PUT", Path: path}
	req.Body = opts.Body
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type UpdateItemCommentOptions struct {
	SpaceId        string
	BoardId        string
	ItemId         string
	ItemCommentId  string
	Body           any
	IdempotencyKey string
}

// DeleteItemComment executes the deleteItemComment operation: DELETE /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}
func (c *Client) DeleteItemComment(ctx context.Context, opts DeleteItemCommentOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemCommentId}", url.PathEscape(opts.ItemCommentId))
	req := Request{Method: "DELETE", Path: path}
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type DeleteItemCommentOptions struct {
	SpaceId       string
	BoardId       string
	ItemId        string
	ItemCommentId string
}

// ReplaceCommentReactions executes the replaceCommentReactions operation: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}/reactions
func (c *Client) ReplaceCommentReactions(ctx context.Context, opts ReplaceCommentReactionsOptions) (any, error) {
	path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll("/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}/reactions", "{spaceId}", url.PathEscape(opts.SpaceId)), "{boardId}", url.PathEscape(opts.BoardId)), "{itemId}", url.PathEscape(opts.ItemId)), "{itemCommentId}", url.PathEscape(opts.ItemCommentId))
	req := Request{Method: "PUT", Path: path}
	req.Body = opts.Body
	req.Idempotency = opts.IdempotencyKey
	var out any
	if err := c.Do(ctx, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

type ReplaceCommentReactionsOptions struct {
	SpaceId        string
	BoardId        string
	ItemId         string
	ItemCommentId  string
	Body           any
	IdempotencyKey string
}
