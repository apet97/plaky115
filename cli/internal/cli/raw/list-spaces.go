// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listSpaces
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newListSpacesCmd(client *plakysdk.Client) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-spaces",
		Short: "List workspace spaces",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunListSpaces(ctx, cmd, client)
		},
	}
	cmd.Flags().Int("page", 0, "Page number (1-based)")
	cmd.Flags().Int("page-size", 0, "Page size")
	return cmd
}
