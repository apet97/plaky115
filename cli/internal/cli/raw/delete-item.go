// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItem
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newDeleteItemCmd(client *plakysdk.Client) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "delete-item",
		Short: "Delete an item",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunDeleteItem(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "spaceId (required)")
	cmd.Flags().String("board-id", "", "boardId (required)")
	cmd.Flags().String("item-id", "", "itemId (required)")
	return cmd
}
