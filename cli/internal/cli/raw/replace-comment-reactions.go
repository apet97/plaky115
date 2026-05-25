// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=replaceCommentReactions
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newReplaceCommentReactionsCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "replace-comment-reactions",
		Short: "Replace comment reactions",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunReplaceCommentReactions(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "spaceId (required)")
	cmd.Flags().String("board-id", "", "boardId (required)")
	cmd.Flags().String("item-id", "", "itemId (required)")
	cmd.Flags().String("item-comment-id", "", "itemCommentId (required)")
	cmd.Flags().String("body", "", "Request body JSON or @file.json")
	return cmd
}
