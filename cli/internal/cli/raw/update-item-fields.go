// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemFields
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newUpdateItemFieldsCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:         "update-item-fields",
		Short:       "Update item fields",
		Annotations: map[string]string{"plaky115.stdin-consumer": "body"},
		Args:        cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunUpdateItemFields(ctx, cmd, getClient)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("item-id", "", "Represents unique item identifier across the system. (required)")
	cmd.Flags().String("body", "", "Request body JSON, @file.json, or @- for stdin (required)")
	cmd.Flags().String("idempotency-key", "", "Idempotency-Key header for safe write retries")
	return cmd
}
