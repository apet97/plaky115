// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listSubitems
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newListSubitemsCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-subitems",
		Short: "List subitems",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunListSubitems(ctx, cmd, getClient)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("item-id", "", "Represents unique item identifier across the system. (required)")
	cmd.Flags().StringArray("expand", nil, "Comma-separated list of relationships to expand into full objects instead of IDs.")
	cmd.Flags().Int("page", 0, "Page number.")
	cmd.Flags().Int("page-size", 0, "Page size.")
	return cmd
}
