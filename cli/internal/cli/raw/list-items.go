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
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunListItems(ctx, cmd, getClient)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().Int64("board-view-id", 0, "Represents unique board view identifier across the system.")
	cmd.Flags().Int64("parent-id", 0, "Represents unique item identifier across the system.")
	cmd.Flags().String("subitems-behaviour", "", "Indicates how subitems are treated in the response. By default subitems will be included. This flag is not applicable when **parentId** is set. **Options:** * **INCLUDE**: Includes subitems in the top level response. * **EXCLUDE**: Excludes subitems from the top level response. * **EMBED**: Excludes from top level and embeds into each parent with sorts and filters applied. Allowed values: INCLUDE, EXCLUDE, EMBED.")
	cmd.Flags().StringArray("expand", nil, "Comma-separated list of relationships to expand into full objects instead of IDs.")
	cmd.Flags().Int("page", 0, "Page number.")
	cmd.Flags().Int("page-size", 0, "Page size.")
	return cmd
}
