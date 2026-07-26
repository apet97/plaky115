// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItemGroup
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newDeleteItemGroupCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "delete-item-group",
		Short: "Delete an item group",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunDeleteItemGroup(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("item-group-id", "", "Represents unique item group identifier across the system. (required)")
	cmd.Flags().Bool("confirm", false, "Confirm execution of this destructive raw operation")
	return cmd
}
