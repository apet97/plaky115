// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listTeams
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newListTeamsCmd(client *plakysdk.Client) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-teams",
		Short: "List workspace teams",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunListTeams(ctx, cmd, client)
		},
	}
	cmd.Flags().Int("page", 0, "Page number (1-based)")
	cmd.Flags().Int("page-size", 0, "Page size")
	return cmd
}
