// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json
// Regenerate: npm run generate:cli
package plakydx

import (
	"context"

	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

// RunGetWidget reads raw flags and executes getWidget.
func RunGetWidget(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	widgetId, err := requiredStringFlag(cmd, "widget-id")
	if err != nil {
		return err
	}
	status, err := optionalStringFlag(cmd, "status")
	if err != nil {
		return err
	}
	limit, err := optionalIntFlag(cmd, "limit")
	if err != nil {
		return err
	}
	cursor, err := optionalInt64Flag(cmd, "cursor")
	if err != nil {
		return err
	}
	labels, err := optionalStringArrayFlag(cmd, "labels")
	if err != nil {
		return err
	}
	opts := plakysdk.GetWidgetOptions{
		WidgetId: widgetId,
		Status:   status,
		Limit:    limit,
		Cursor:   cursor,
		Labels:   labels,
	}
	out, err := c.GetWidget(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunCreateWidget reads raw flags and executes createWidget.
func RunCreateWidget(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	jsonBody, err := jsonBodyFlag(cmd, true)
	if err != nil {
		return err
	}
	idempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")
	if err != nil {
		return err
	}
	opts := plakysdk.CreateWidgetOptions{
		JSONBody:       jsonBody,
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.CreateWidget(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunArchiveWidget reads raw flags and executes archiveWidget.
func RunArchiveWidget(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	if err := confirmationFlag(cmd); err != nil {
		return err
	}
	widgetId, err := requiredStringFlag(cmd, "widget-id")
	if err != nil {
		return err
	}
	opts := plakysdk.ArchiveWidgetOptions{
		WidgetId: widgetId,
	}
	if err := c.ArchiveWidget(ctx, opts); err != nil {
		return err
	}
	return emitVoid(cmd)
}

// RunUploadWidgetFile reads raw flags and executes uploadWidgetFile.
func RunUploadWidgetFile(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	widgetId, err := requiredStringFlag(cmd, "widget-id")
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
	opts := plakysdk.UploadWidgetFileOptions{
		WidgetId: widgetId,
		Multipart: &plakysdk.MultipartFileBody{
			Reader:      upload.Reader,
			FileName:    upload.FileName,
			ContentType: upload.ContentType,
		},
		IdempotencyKey: idempotencyKey,
	}
	out, err := c.UploadWidgetFile(ctx, opts)
	if err != nil {
		return err
	}
	return EmitJSON(cmd, out)
}

// RunDeleteWidget reads raw flags and executes deleteWidget.
func RunDeleteWidget(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {
	if err := confirmationFlag(cmd); err != nil {
		return err
	}
	widgetId, err := requiredStringFlag(cmd, "widget-id")
	if err != nil {
		return err
	}
	opts := plakysdk.DeleteWidgetOptions{
		WidgetId: widgetId,
	}
	if err := c.DeleteWidget(ctx, opts); err != nil {
		return err
	}
	return emitVoid(cmd)
}
