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
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunListSpaces(ctx, cmd, client)
		},
	}
	cmd.Flags().Int("page", 0, "Page number (1-based)")
	cmd.Flags().Int("page-size", 0, "Page size")
	cmd.Flags().String("expand", "", "Comma-separated list of relationships to be expanded into full objects.")
	return cmd
}
