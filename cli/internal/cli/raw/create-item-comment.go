// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createItemComment
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newCreateItemCommentCmd(client *plakysdk.Client) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-item-comment",
		Short: "Create item comment",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunCreateItemComment(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "spaceId (required)")
	cmd.Flags().String("board-id", "", "boardId (required)")
	cmd.Flags().String("item-id", "", "itemId (required)")
	cmd.Flags().String("body", "", "Request body JSON or @file.json")
	return cmd
}
