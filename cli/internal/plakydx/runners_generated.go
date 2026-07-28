// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json
// Regenerate: npm run generate:cli
package plakydx

import (
	"context"

	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

// RunListSpaces reads raw flags and executes listSpaces.
func RunListSpaces(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	expand, err := optionalStringArrayFlag(cmd, "expand")
	if err != nil {
		return err
	}
	page, err := optionalIntFlag(cmd, "page")
	if err != nil {
		return err
	}
	pageSize, err := optionalIntFlag(cmd, "page-size")
	if err != nil {
		return err
	}
	opts := plakysdk.ListSpacesOptions{
		Expand:   expand,
		Page:     page,
		PageSize: pageSize,
	}
	out, err := c.ListSpaces(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunGetSpace reads raw flags and executes getSpace.
func RunGetSpace(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	expand, err := optionalStringArrayFlag(cmd, "expand")
	if err != nil {
		return err
	}
	opts := plakysdk.GetSpaceOptions{
		SpaceId: spaceId,
		Expand:  expand,
	}
	out, err := c.GetSpace(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunListBoards reads raw flags and executes listBoards.
func RunListBoards(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	page, err := optionalIntFlag(cmd, "page")
	if err != nil {
		return err
	}
	pageSize, err := optionalIntFlag(cmd, "page-size")
	if err != nil {
		return err
	}
	opts := plakysdk.ListBoardsOptions{
		SpaceId:  spaceId,
		Page:     page,
		PageSize: pageSize,
	}
	out, err := c.ListBoards(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunGetBoard reads raw flags and executes getBoard.
func RunGetBoard(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	opts := plakysdk.GetBoardOptions{
		SpaceId: spaceId,
		BoardId: boardId,
	}
	out, err := c.GetBoard(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunListItemGroups reads raw flags and executes listItemGroups.
func RunListItemGroups(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	page, err := optionalIntFlag(cmd, "page")
	if err != nil {
		return err
	}
	pageSize, err := optionalIntFlag(cmd, "page-size")
	if err != nil {
		return err
	}
	opts := plakysdk.ListItemGroupsOptions{
		SpaceId:  spaceId,
		BoardId:  boardId,
		Page:     page,
		PageSize: pageSize,
	}
	out, err := c.ListItemGroups(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunCreateItemGroup reads raw flags and executes createItemGroup.
func RunCreateItemGroup(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	jsonBody, err := jsonBodyFlag(cmd, true)
	if err != nil {
		return err
	}
	idempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")
	if err != nil {
		return err
	}
	opts := plakysdk.CreateItemGroupOptions{
		SpaceId:        spaceId,
		BoardId:        boardId,
		JSONBody:       jsonBody,
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.CreateItemGroup(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunDeleteItemGroup reads raw flags and executes deleteItemGroup.
func RunDeleteItemGroup(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	if err := confirmationFlag(cmd); err != nil {
		return err
	}
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemGroupId, err := requiredInt64IDFlag(cmd, "item-group-id")
	if err != nil {
		return err
	}
	opts := plakysdk.DeleteItemGroupOptions{
		SpaceId:     spaceId,
		BoardId:     boardId,
		ItemGroupId: itemGroupId,
	}
	if err := c.DeleteItemGroup(ctx, opts); err != nil {
		return err
	}
	return emitVoid(cmd)
}

// RunGetItemGroup reads raw flags and executes getItemGroup.
func RunGetItemGroup(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemGroupId, err := requiredInt64IDFlag(cmd, "item-group-id")
	if err != nil {
		return err
	}
	opts := plakysdk.GetItemGroupOptions{
		SpaceId:     spaceId,
		BoardId:     boardId,
		ItemGroupId: itemGroupId,
	}
	out, err := c.GetItemGroup(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunUpdateItemGroup reads raw flags and executes updateItemGroup.
func RunUpdateItemGroup(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemGroupId, err := requiredInt64IDFlag(cmd, "item-group-id")
	if err != nil {
		return err
	}
	jsonBody, err := jsonBodyFlag(cmd, true)
	if err != nil {
		return err
	}
	idempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")
	if err != nil {
		return err
	}
	opts := plakysdk.UpdateItemGroupOptions{
		SpaceId:        spaceId,
		BoardId:        boardId,
		ItemGroupId:    itemGroupId,
		JSONBody:       jsonBody,
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.UpdateItemGroup(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunArchiveItemGroup reads raw flags and executes archiveItemGroup.
func RunArchiveItemGroup(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	if err := confirmationFlag(cmd); err != nil {
		return err
	}
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemGroupId, err := requiredInt64IDFlag(cmd, "item-group-id")
	if err != nil {
		return err
	}
	opts := plakysdk.ArchiveItemGroupOptions{
		SpaceId:     spaceId,
		BoardId:     boardId,
		ItemGroupId: itemGroupId,
	}
	if err := c.ArchiveItemGroup(ctx, opts); err != nil {
		return err
	}
	return emitVoid(cmd)
}

// RunListItems reads raw flags and executes listItems.
func RunListItems(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	boardViewId, err := optionalInt64Flag(cmd, "board-view-id")
	if err != nil {
		return err
	}
	parentId, err := optionalInt64Flag(cmd, "parent-id")
	if err != nil {
		return err
	}
	subitemsBehaviour, err := optionalStringFlag(cmd, "subitems-behaviour")
	if err != nil {
		return err
	}
	expand, err := optionalStringArrayFlag(cmd, "expand")
	if err != nil {
		return err
	}
	page, err := optionalIntFlag(cmd, "page")
	if err != nil {
		return err
	}
	pageSize, err := optionalIntFlag(cmd, "page-size")
	if err != nil {
		return err
	}
	opts := plakysdk.ListItemsOptions{
		SpaceId:           spaceId,
		BoardId:           boardId,
		BoardViewId:       boardViewId,
		ParentId:          parentId,
		SubitemsBehaviour: subitemsBehaviour,
		Expand:            expand,
		Page:              page,
		PageSize:          pageSize,
	}
	out, err := c.ListItems(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunCreateItem reads raw flags and executes createItem.
func RunCreateItem(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	jsonBody, err := jsonBodyFlag(cmd, true)
	if err != nil {
		return err
	}
	idempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")
	if err != nil {
		return err
	}
	opts := plakysdk.CreateItemOptions{
		SpaceId:        spaceId,
		BoardId:        boardId,
		JSONBody:       jsonBody,
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.CreateItem(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunDeleteItem reads raw flags and executes deleteItem.
func RunDeleteItem(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	if err := confirmationFlag(cmd); err != nil {
		return err
	}
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	opts := plakysdk.DeleteItemOptions{
		SpaceId: spaceId,
		BoardId: boardId,
		ItemId:  itemId,
	}
	if err := c.DeleteItem(ctx, opts); err != nil {
		return err
	}
	return emitVoid(cmd)
}

// RunGetItem reads raw flags and executes getItem.
func RunGetItem(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	expand, err := optionalStringArrayFlag(cmd, "expand")
	if err != nil {
		return err
	}
	opts := plakysdk.GetItemOptions{
		SpaceId: spaceId,
		BoardId: boardId,
		ItemId:  itemId,
		Expand:  expand,
	}
	out, err := c.GetItem(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunListItemComments reads raw flags and executes listItemComments.
func RunListItemComments(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	opts := plakysdk.ListItemCommentsOptions{
		SpaceId: spaceId,
		BoardId: boardId,
		ItemId:  itemId,
	}
	out, err := c.ListItemComments(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunCreateItemComment reads raw flags and executes createItemComment.
func RunCreateItemComment(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	jsonBody, err := jsonBodyFlag(cmd, true)
	if err != nil {
		return err
	}
	idempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")
	if err != nil {
		return err
	}
	opts := plakysdk.CreateItemCommentOptions{
		SpaceId:        spaceId,
		BoardId:        boardId,
		ItemId:         itemId,
		JSONBody:       jsonBody,
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.CreateItemComment(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunDeleteItemComment reads raw flags and executes deleteItemComment.
func RunDeleteItemComment(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	if err := confirmationFlag(cmd); err != nil {
		return err
	}
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	itemCommentId, err := requiredInt64IDFlag(cmd, "item-comment-id")
	if err != nil {
		return err
	}
	opts := plakysdk.DeleteItemCommentOptions{
		SpaceId:       spaceId,
		BoardId:       boardId,
		ItemId:        itemId,
		ItemCommentId: itemCommentId,
	}
	if err := c.DeleteItemComment(ctx, opts); err != nil {
		return err
	}
	return emitVoid(cmd)
}

// RunUpdateItemComment reads raw flags and executes updateItemComment.
func RunUpdateItemComment(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	itemCommentId, err := requiredInt64IDFlag(cmd, "item-comment-id")
	if err != nil {
		return err
	}
	jsonBody, err := jsonBodyFlag(cmd, true)
	if err != nil {
		return err
	}
	idempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")
	if err != nil {
		return err
	}
	opts := plakysdk.UpdateItemCommentOptions{
		SpaceId:        spaceId,
		BoardId:        boardId,
		ItemId:         itemId,
		ItemCommentId:  itemCommentId,
		JSONBody:       jsonBody,
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.UpdateItemComment(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunReplaceCommentReactions reads raw flags and executes replaceCommentReactions.
func RunReplaceCommentReactions(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	itemCommentId, err := requiredInt64IDFlag(cmd, "item-comment-id")
	if err != nil {
		return err
	}
	jsonBody, err := jsonBodyFlag(cmd, true)
	if err != nil {
		return err
	}
	idempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")
	if err != nil {
		return err
	}
	opts := plakysdk.ReplaceCommentReactionsOptions{
		SpaceId:        spaceId,
		BoardId:        boardId,
		ItemId:         itemId,
		ItemCommentId:  itemCommentId,
		JSONBody:       jsonBody,
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.ReplaceCommentReactions(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunUpdateItemFields reads raw flags and executes updateItemFields.
func RunUpdateItemFields(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	jsonBody, err := jsonBodyFlag(cmd, true)
	if err != nil {
		return err
	}
	idempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")
	if err != nil {
		return err
	}
	opts := plakysdk.UpdateItemFieldsOptions{
		SpaceId:        spaceId,
		BoardId:        boardId,
		ItemId:         itemId,
		JSONBody:       jsonBody,
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.UpdateItemFields(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunUpdateItemField reads raw flags and executes updateItemField.
func RunUpdateItemField(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	itemFieldKey, err := requiredStringFlag(cmd, "item-field-key")
	if err != nil {
		return err
	}
	jsonBody, err := jsonBodyFlag(cmd, true)
	if err != nil {
		return err
	}
	idempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")
	if err != nil {
		return err
	}
	opts := plakysdk.UpdateItemFieldOptions{
		SpaceId:        spaceId,
		BoardId:        boardId,
		ItemId:         itemId,
		ItemFieldKey:   itemFieldKey,
		JSONBody:       jsonBody,
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.UpdateItemField(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunListItemFiles reads raw flags and executes listItemFiles.
func RunListItemFiles(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	opts := plakysdk.ListItemFilesOptions{
		SpaceId: spaceId,
		BoardId: boardId,
		ItemId:  itemId,
	}
	out, err := c.ListItemFiles(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunUploadItemFile reads raw flags and executes uploadItemFile.
func RunUploadItemFile(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	upload, err := openUploadFlag(cmd)
	if err != nil {
		return err
	}
	defer upload.Close()
	idempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")
	if err != nil {
		return err
	}
	opts := plakysdk.UploadItemFileOptions{
		SpaceId: spaceId,
		BoardId: boardId,
		ItemId:  itemId,
		Multipart: &plakysdk.MultipartFileBody{
			Reader:      upload.Reader,
			FileName:    upload.FileName,
			ContentType: upload.ContentType,
		},
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.UploadItemFile(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunDeleteItemFile reads raw flags and executes deleteItemFile.
func RunDeleteItemFile(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	if err := confirmationFlag(cmd); err != nil {
		return err
	}
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	itemFileId, err := requiredInt64IDFlag(cmd, "item-file-id")
	if err != nil {
		return err
	}
	opts := plakysdk.DeleteItemFileOptions{
		SpaceId:    spaceId,
		BoardId:    boardId,
		ItemId:     itemId,
		ItemFileId: itemFileId,
	}
	if err := c.DeleteItemFile(ctx, opts); err != nil {
		return err
	}
	return emitVoid(cmd)
}

// RunGetItemFile reads raw flags and executes getItemFile.
func RunGetItemFile(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	itemFileId, err := requiredInt64IDFlag(cmd, "item-file-id")
	if err != nil {
		return err
	}
	opts := plakysdk.GetItemFileOptions{
		SpaceId:    spaceId,
		BoardId:    boardId,
		ItemId:     itemId,
		ItemFileId: itemFileId,
	}
	out, err := c.GetItemFile(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunUpdateItemFile reads raw flags and executes updateItemFile.
func RunUpdateItemFile(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	itemFileId, err := requiredInt64IDFlag(cmd, "item-file-id")
	if err != nil {
		return err
	}
	jsonBody, err := jsonBodyFlag(cmd, true)
	if err != nil {
		return err
	}
	idempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")
	if err != nil {
		return err
	}
	opts := plakysdk.UpdateItemFileOptions{
		SpaceId:        spaceId,
		BoardId:        boardId,
		ItemId:         itemId,
		ItemFileId:     itemFileId,
		JSONBody:       jsonBody,
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.UpdateItemFile(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunGetItemFileDownload reads raw flags and executes getItemFileDownload.
func RunGetItemFileDownload(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	itemFileId, err := requiredInt64IDFlag(cmd, "item-file-id")
	if err != nil {
		return err
	}
	opts := plakysdk.GetItemFileDownloadOptions{
		SpaceId:    spaceId,
		BoardId:    boardId,
		ItemId:     itemId,
		ItemFileId: itemFileId,
	}
	out, err := c.GetItemFileDownload(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunListSubitems reads raw flags and executes listSubitems.
func RunListSubitems(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	spaceId, err := requiredInt64IDFlag(cmd, "space-id")
	if err != nil {
		return err
	}
	boardId, err := requiredInt64IDFlag(cmd, "board-id")
	if err != nil {
		return err
	}
	itemId, err := requiredInt64IDFlag(cmd, "item-id")
	if err != nil {
		return err
	}
	expand, err := optionalStringArrayFlag(cmd, "expand")
	if err != nil {
		return err
	}
	page, err := optionalIntFlag(cmd, "page")
	if err != nil {
		return err
	}
	pageSize, err := optionalIntFlag(cmd, "page-size")
	if err != nil {
		return err
	}
	opts := plakysdk.ListSubitemsOptions{
		SpaceId:  spaceId,
		BoardId:  boardId,
		ItemId:   itemId,
		Expand:   expand,
		Page:     page,
		PageSize: pageSize,
	}
	out, err := c.ListSubitems(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunListTeams reads raw flags and executes listTeams.
func RunListTeams(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	page, err := optionalIntFlag(cmd, "page")
	if err != nil {
		return err
	}
	pageSize, err := optionalIntFlag(cmd, "page-size")
	if err != nil {
		return err
	}
	opts := plakysdk.ListTeamsOptions{
		Page:     page,
		PageSize: pageSize,
	}
	out, err := c.ListTeams(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunGetTeam reads raw flags and executes getTeam.
func RunGetTeam(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	teamId, err := requiredInt64IDFlag(cmd, "team-id")
	if err != nil {
		return err
	}
	opts := plakysdk.GetTeamOptions{
		TeamId: teamId,
	}
	out, err := c.GetTeam(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunListUsers reads raw flags and executes listUsers.
func RunListUsers(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	emails, err := optionalStringArrayFlag(cmd, "emails")
	if err != nil {
		return err
	}
	status, err := optionalStringFlag(cmd, "status")
	if err != nil {
		return err
	}
	typeValue, err := optionalStringFlag(cmd, "type")
	if err != nil {
		return err
	}
	page, err := optionalIntFlag(cmd, "page")
	if err != nil {
		return err
	}
	pageSize, err := optionalIntFlag(cmd, "page-size")
	if err != nil {
		return err
	}
	opts := plakysdk.ListUsersOptions{
		Emails:   emails,
		Status:   status,
		Type:     typeValue,
		Page:     page,
		PageSize: pageSize,
	}
	out, err := c.ListUsers(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunGetCurrentUser reads raw flags and executes getCurrentUser.
func RunGetCurrentUser(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	opts := plakysdk.GetCurrentUserOptions{}
	out, err := c.GetCurrentUser(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}
