// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItemComment
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newDeleteItemCommentCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "delete-item-comment",
		Short: "Delete item comment",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunDeleteItemComment(ctx, cmd, getClient)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("item-id", "", "Represents unique item identifier across the system. (required)")
	cmd.Flags().String("item-comment-id", "", "Represents unique item comment identifier across the system. (required)")
	cmd.Flags().Bool("confirm", false, "Confirm execution of this destructive raw operation")
	return cmd
}
