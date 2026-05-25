// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemComment
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newUpdateItemCommentCmd(client *plakysdk.Client) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update-item-comment",
		Short: "Update item comment",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunUpdateItemComment(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "spaceId (required)")
	cmd.Flags().String("board-id", "", "boardId (required)")
	cmd.Flags().String("item-id", "", "itemId (required)")
	cmd.Flags().String("item-comment-id", "", "itemCommentId (required)")
	cmd.Flags().String("body", "", "Request body JSON or @file.json")
	return cmd
}
