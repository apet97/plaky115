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
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunListSubitems(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Plaky space ID for the target workspace area (required)")
	cmd.Flags().String("board-id", "", "Plaky board ID within the selected space (required)")
	cmd.Flags().String("item-id", "", "Plaky item ID within the selected board (required)")
	cmd.Flags().Int("page", 0, "Page number (1-based)")
	cmd.Flags().Int("page-size", 0, "Page size")
	cmd.Flags().String("expand", "", "Comma-separated list of relationships to expand into full objects instead of IDs.")
	return cmd
}
