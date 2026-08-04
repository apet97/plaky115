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
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunGetItem(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("item-id", "", "Represents unique item identifier across the system. (required)")
	cmd.Flags().StringArray("expand", nil, "Comma-separated list of relationships to expand into full objects instead of IDs.")
	return cmd
}
