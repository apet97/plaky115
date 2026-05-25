// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listUsers
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newListUsersCmd(client *plakysdk.Client) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-users",
		Short: "List workspace users",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunListUsers(ctx, cmd, client)
		},
	}
	cmd.Flags().Int("page", 0, "Page number (1-based)")
	cmd.Flags().Int("page-size", 0, "Page size")
	return cmd
}
