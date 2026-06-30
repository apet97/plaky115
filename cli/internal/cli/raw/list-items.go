// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listItems
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newListItemsCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-items",
		Short: "List board items",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunListItems(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Plaky space ID for the target workspace area (required)")
	cmd.Flags().String("board-id", "", "Plaky board ID within the selected space (required)")
	cmd.Flags().Int("page", 0, "Page number (1-based)")
	cmd.Flags().Int("page-size", 0, "Page size")
	cmd.Flags().String("board-view-id", "", "Represents unique board view identifier across the system.")
	cmd.Flags().String("parent-id", "", "Represents unique item identifier across the system.")
	cmd.Flags().String("subitems-behaviour", "", "Indicates how subitems are treated in the response. By default subitems will be included. This flag is not applicable when **parentId** is set. **Options:** * **INCLUDE**: Includes subitems in the top level response. * **EXCLUDE**: Excludes subitems from the top level response. * **EMBED**: Excludes from top level and embeds into each parent with sorts and filters applied.")
	cmd.Flags().String("expand", "", "Comma-separated list of relationships to expand into full objects instead of IDs.")
	return cmd
}
