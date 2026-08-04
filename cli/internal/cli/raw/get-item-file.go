// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getItemFile
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newGetItemFileCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-item-file",
		Short: "Retrieve an item file",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunGetItemFile(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("item-id", "", "Represents unique item identifier across the system. (required)")
	cmd.Flags().String("item-file-id", "", "Represents unique item file identifier across the system. (required)")
	return cmd
}
