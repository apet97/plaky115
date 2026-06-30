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
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunListUsers(ctx, cmd, client)
		},
	}
	cmd.Flags().Int("page", 0, "Page number (1-based)")
	cmd.Flags().Int("page-size", 0, "Page size")
	cmd.Flags().StringArray("emails", nil, "If provided, you will get list of users filtered for the provided emails")
	cmd.Flags().String("status", "", "If provided, you will get list of users filtered for the provided status")
	cmd.Flags().String("type", "", "If provided, you will get list of users filtered for the provided type")
	return cmd
}
