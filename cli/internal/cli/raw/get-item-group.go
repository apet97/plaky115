// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getItemGroup
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newGetItemGroupCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-item-group",
		Short: "Retrieve an item group",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunGetItemGroup(ctx, cmd, getClient)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("item-group-id", "", "Represents unique item group identifier across the system. (required)")
	return cmd
}
