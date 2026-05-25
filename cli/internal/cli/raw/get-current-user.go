// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getCurrentUser
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newGetCurrentUserCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-current-user",
		Short: "Retrieve current user",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunGetCurrentUser(ctx, cmd, client)
		},
	}
	return cmd
}
