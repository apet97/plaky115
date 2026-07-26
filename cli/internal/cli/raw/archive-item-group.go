// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=archiveItemGroup
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newArchiveItemGroupCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "archive-item-group",
		Short: "Archive an item group",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunArchiveItemGroup(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("item-group-id", "", "Represents unique item group identifier across the system. (required)")
	cmd.Flags().Bool("confirm", false, "Confirm execution of this destructive raw operation")
	return cmd
}
