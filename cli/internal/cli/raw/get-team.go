// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getTeam
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newGetTeamCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-team",
		Short: "Retrieve a team",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunGetTeam(ctx, cmd, client)
		},
	}
	cmd.Flags().String("team-id", "", "Plaky team ID to retrieve (required)")
	return cmd
}
