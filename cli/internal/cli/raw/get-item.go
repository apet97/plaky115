// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getItem
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newGetItemCmd(client *plakysdk.Client) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-item",
		Short: "Retrieve an item",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunGetItem(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "spaceId (required)")
	cmd.Flags().String("board-id", "", "boardId (required)")
	cmd.Flags().String("item-id", "", "itemId (required)")
	return cmd
}
