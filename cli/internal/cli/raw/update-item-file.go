// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemFile
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newUpdateItemFileCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update-item-file",
		Short: "Update an item file",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunUpdateItemFile(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("item-id", "", "Represents unique item identifier across the system. (required)")
	cmd.Flags().String("item-file-id", "", "Represents unique item file identifier across the system. (required)")
	cmd.Flags().String("body", "", "Request body JSON, @file.json, or @- for stdin (required)")
	cmd.Flags().String("idempotency-key", "", "Idempotency-Key header for safe write retries")
	return cmd
}
