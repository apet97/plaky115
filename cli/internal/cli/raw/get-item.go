// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getItem
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newGetItemCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-item",
		Short: "Retrieve an item",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunGetItem(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Plaky space ID for the target workspace area (required)")
	cmd.Flags().String("board-id", "", "Plaky board ID within the selected space (required)")
	cmd.Flags().String("item-id", "", "Plaky item ID within the selected board (required)")
	return cmd
}
