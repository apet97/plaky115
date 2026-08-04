// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItemFile
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newDeleteItemFileCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "delete-item-file",
		Short: "Delete an item file",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunDeleteItemFile(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Unique identifier of the board. (required)")
	cmd.Flags().String("item-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("item-file-id", "", "Represents unique item file identifier across the system. (required)")
	cmd.Flags().Bool("confirm", false, "Confirm execution of this destructive raw operation")
	return cmd
}
