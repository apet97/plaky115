// Package plakydx hosts the cobra-bound runtime helpers and stub runners
// that the generated raw subtree calls. Each Run<Op> reads flags, calls
// the corresponding plakysdk method, and prints the JSON response.
package plakydx

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func emit(cmd *cobra.Command, value any) error {
	enc := json.NewEncoder(cmd.OutOrStdout())
	enc.SetIndent("", "  ")
	return enc.Encode(value)
}

func mustString(cmd *cobra.Command, name string) (string, error) {
	v, err := cmd.Flags().GetString(name)
	if err != nil {
		return "", err
	}
	if v == "" {
		return "", fmt.Errorf("--%s is required", name)
	}
	return v, nil
}

func pageOpts(cmd *cobra.Command) (page int, pageSize int) {
	page, _ = cmd.Flags().GetInt("page")
	pageSize, _ = cmd.Flags().GetInt("page-size")
	return
}

func bodyRequired(cmd *cobra.Command) (any, error) {
	raw, _ := cmd.Flags().GetString("body")
	if raw == "" {
		return nil, fmt.Errorf("--body is required")
	}
	return ParseBody(cmd, raw)
}

// ParseBody resolves a raw --body value into JSON: "@-" reads stdin, "@file"
// reads a file, and anything else is parsed as inline JSON. This is the single
// home for --body semantics shared by the generated raw runners and the curated
// commands.
func ParseBody(cmd *cobra.Command, raw string) (any, error) {
	if raw == "@-" {
		b, err := io.ReadAll(cmd.InOrStdin())
		if err != nil {
			return nil, fmt.Errorf("read --body @-: %w", err)
		}
		raw = string(b)
	} else if file, ok := strings.CutPrefix(raw, "@"); ok {
		b, err := os.ReadFile(file)
		if err != nil {
			return nil, fmt.Errorf("read --body file: %w", err)
		}
		raw = string(b)
	}
	var v any
	if err := json.Unmarshal([]byte(raw), &v); err != nil {
		return nil, fmt.Errorf("invalid --body JSON: %w", err)
	}
	return v, nil
}

func idempotencyKey(cmd *cobra.Command) string {
	key, _ := cmd.Flags().GetString("idempotency-key")
	return key
}

func expandFlag(cmd *cobra.Command) string {
	v, _ := cmd.Flags().GetString("expand")
	return v
}

func confirmDestructive(cmd *cobra.Command) error {
	confirmed, _ := cmd.Flags().GetBool("confirm")
	if !confirmed {
		return fmt.Errorf("--confirm is required for destructive raw DELETE operations")
	}
	return nil
}

// ---- generated mapping (one per operation) ----

func RunListSpaces(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	p, ps := pageOpts(cmd)
	out, err := c.ListSpaces(ctx, plakysdk.ListSpacesOptions{Page: p, PageSize: ps, Expand: expandFlag(cmd)})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunListTeams(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	p, ps := pageOpts(cmd)
	out, err := c.ListTeams(ctx, plakysdk.ListTeamsOptions{Page: p, PageSize: ps})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunListUsers(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	p, ps := pageOpts(cmd)
	out, err := c.ListUsers(ctx, plakysdk.ListUsersOptions{Page: p, PageSize: ps})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunListBoards(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	p, ps := pageOpts(cmd)
	out, err := c.ListBoards(ctx, plakysdk.ListBoardsOptions{SpaceId: spaceID, Page: p, PageSize: ps})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunListItems(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	p, ps := pageOpts(cmd)
	out, err := c.ListItems(ctx, plakysdk.ListItemsOptions{SpaceId: spaceID, BoardId: boardID, Page: p, PageSize: ps, Expand: expandFlag(cmd)})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunCreateItem(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	body, err := bodyRequired(cmd)
	if err != nil {
		return err
	}
	out, err := c.CreateItem(ctx, plakysdk.CreateItemOptions{SpaceId: spaceID, BoardId: boardID, Body: body, IdempotencyKey: idempotencyKey(cmd)})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunGetSpace(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	out, err := c.GetSpace(ctx, plakysdk.GetSpaceOptions{SpaceId: spaceID, Expand: expandFlag(cmd)})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunGetTeam(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	teamID, err := mustString(cmd, "team-id")
	if err != nil {
		return err
	}
	out, err := c.GetTeam(ctx, plakysdk.GetTeamOptions{TeamId: teamID})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunGetCurrentUser(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	out, err := c.GetCurrentUser(ctx, plakysdk.GetCurrentUserOptions{})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunGetBoard(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	out, err := c.GetBoard(ctx, plakysdk.GetBoardOptions{SpaceId: spaceID, BoardId: boardID})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunListSubitems(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	itemID, err := mustString(cmd, "item-id")
	if err != nil {
		return err
	}
	p, ps := pageOpts(cmd)
	out, err := c.ListSubitems(ctx, plakysdk.ListSubitemsOptions{SpaceId: spaceID, BoardId: boardID, ItemId: itemID, Page: p, PageSize: ps, Expand: expandFlag(cmd)})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunGetItem(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	itemID, err := mustString(cmd, "item-id")
	if err != nil {
		return err
	}
	out, err := c.GetItem(ctx, plakysdk.GetItemOptions{SpaceId: spaceID, BoardId: boardID, ItemId: itemID, Expand: expandFlag(cmd)})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunDeleteItem(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	if err := confirmDestructive(cmd); err != nil {
		return err
	}
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	itemID, err := mustString(cmd, "item-id")
	if err != nil {
		return err
	}
	out, err := c.DeleteItem(ctx, plakysdk.DeleteItemOptions{SpaceId: spaceID, BoardId: boardID, ItemId: itemID})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunUpdateItemField(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	itemID, err := mustString(cmd, "item-id")
	if err != nil {
		return err
	}
	fieldKey, err := mustString(cmd, "item-field-key")
	if err != nil {
		return err
	}
	body, err := bodyRequired(cmd)
	if err != nil {
		return err
	}
	out, err := c.UpdateItemField(ctx, plakysdk.UpdateItemFieldOptions{SpaceId: spaceID, BoardId: boardID, ItemId: itemID, ItemFieldKey: fieldKey, Body: body, IdempotencyKey: idempotencyKey(cmd)})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunUpdateItemFields(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	itemID, err := mustString(cmd, "item-id")
	if err != nil {
		return err
	}
	body, err := bodyRequired(cmd)
	if err != nil {
		return err
	}
	out, err := c.UpdateItemFields(ctx, plakysdk.UpdateItemFieldsOptions{SpaceId: spaceID, BoardId: boardID, ItemId: itemID, Body: body, IdempotencyKey: idempotencyKey(cmd)})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunListItemComments(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	itemID, err := mustString(cmd, "item-id")
	if err != nil {
		return err
	}
	out, err := c.ListItemComments(ctx, plakysdk.ListItemCommentsOptions{SpaceId: spaceID, BoardId: boardID, ItemId: itemID})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunCreateItemComment(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	itemID, err := mustString(cmd, "item-id")
	if err != nil {
		return err
	}
	body, err := bodyRequired(cmd)
	if err != nil {
		return err
	}
	out, err := c.CreateItemComment(ctx, plakysdk.CreateItemCommentOptions{SpaceId: spaceID, BoardId: boardID, ItemId: itemID, Body: body, IdempotencyKey: idempotencyKey(cmd)})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunUpdateItemComment(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	itemID, err := mustString(cmd, "item-id")
	if err != nil {
		return err
	}
	commentID, err := mustString(cmd, "item-comment-id")
	if err != nil {
		return err
	}
	body, err := bodyRequired(cmd)
	if err != nil {
		return err
	}
	out, err := c.UpdateItemComment(ctx, plakysdk.UpdateItemCommentOptions{SpaceId: spaceID, BoardId: boardID, ItemId: itemID, ItemCommentId: commentID, Body: body, IdempotencyKey: idempotencyKey(cmd)})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunDeleteItemComment(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	if err := confirmDestructive(cmd); err != nil {
		return err
	}
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	itemID, err := mustString(cmd, "item-id")
	if err != nil {
		return err
	}
	commentID, err := mustString(cmd, "item-comment-id")
	if err != nil {
		return err
	}
	out, err := c.DeleteItemComment(ctx, plakysdk.DeleteItemCommentOptions{SpaceId: spaceID, BoardId: boardID, ItemId: itemID, ItemCommentId: commentID})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}

func RunReplaceCommentReactions(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceID, err := mustString(cmd, "space-id")
	if err != nil {
		return err
	}
	boardID, err := mustString(cmd, "board-id")
	if err != nil {
		return err
	}
	itemID, err := mustString(cmd, "item-id")
	if err != nil {
		return err
	}
	commentID, err := mustString(cmd, "item-comment-id")
	if err != nil {
		return err
	}
	body, err := bodyRequired(cmd)
	if err != nil {
		return err
	}
	out, err := c.ReplaceCommentReactions(ctx, plakysdk.ReplaceCommentReactionsOptions{SpaceId: spaceID, BoardId: boardID, ItemId: itemID, ItemCommentId: commentID, Body: body, IdempotencyKey: idempotencyKey(cmd)})
	if err != nil {
		return err
	}
	return emit(cmd, out)
}
