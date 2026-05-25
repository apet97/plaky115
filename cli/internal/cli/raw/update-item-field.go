// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemField
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newUpdateItemFieldCmd(client *plakysdk.Client) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update-item-field",
		Short: "Update one item field",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunUpdateItemField(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "spaceId (required)")
	cmd.Flags().String("board-id", "", "boardId (required)")
	cmd.Flags().String("item-id", "", "itemId (required)")
	cmd.Flags().String("item-field-key", "", "itemFieldKey (required)")
	cmd.Flags().String("body", "", "Request body JSON or @file.json")
	return cmd
}
