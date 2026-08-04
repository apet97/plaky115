// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createItemGroup
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newCreateItemGroupCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-item-group",
		Short: "Create an item group",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunCreateItemGroup(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("body", "", "Request body JSON, @file.json, or @- for stdin (required)")
	cmd.Flags().String("idempotency-key", "", "Idempotency-Key header for safe write retries")
	return cmd
}
