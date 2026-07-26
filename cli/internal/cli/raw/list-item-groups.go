// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listItemGroups
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newListItemGroupsCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-item-groups",
		Short: "List board item groups",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunListItemGroups(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().Int("page", 0, "Page number.")
	cmd.Flags().Int("page-size", 0, "Page size.")
	return cmd
}
