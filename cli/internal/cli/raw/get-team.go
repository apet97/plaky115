// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getTeam
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newGetTeamCmd(client *plakysdk.Client) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-team",
		Short: "Retrieve a team",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunGetTeam(ctx, cmd, client)
		},
	}
	cmd.Flags().String("team-id", "", "teamId (required)")
	return cmd
}
