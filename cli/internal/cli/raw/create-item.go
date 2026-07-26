// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createItem
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newCreateItemCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-item",
		Short: "Create an item",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunCreateItem(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("body", "", "Request body JSON, @file.json, or @- for stdin (required)")
	cmd.Flags().String("idempotency-key", "", "Idempotency-Key header for safe write retries")
	return cmd
}
