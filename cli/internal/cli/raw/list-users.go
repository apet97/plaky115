// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listUsers
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newListUsersCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-users",
		Short: "List workspace users",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunListUsers(ctx, cmd, client)
		},
	}
	cmd.Flags().StringArray("emails", nil, "If provided, you will get list of users filtered for the provided emails")
	cmd.Flags().String("status", "", "If provided, you will get list of users filtered for the provided status Allowed values: ACTIVE, PENDING, INACTIVE.")
	cmd.Flags().String("type", "", "If provided, you will get list of users filtered for the provided type Allowed values: OWNER, ADMIN, MEMBER, VIEWER.")
	cmd.Flags().Int("page", 0, "Page number.")
	cmd.Flags().Int("page-size", 0, "Page size.")
	return cmd
}
