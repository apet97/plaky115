// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listSpaces
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newListSpacesCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-spaces",
		Short: "List workspace spaces",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunListSpaces(ctx, cmd, getClient)
		},
	}
	cmd.Flags().StringArray("expand", nil, "Comma-separated list of relationships to be expanded into full objects.")
	cmd.Flags().Int("page", 0, "Page number.")
	cmd.Flags().Int("page-size", 0, "Page size.")
	return cmd
}
