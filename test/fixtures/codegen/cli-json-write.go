// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createWidget
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newCreateWidgetCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-widget",
		Short: "createWidget fixture",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunCreateWidget(ctx, cmd, client)
		},
	}
	cmd.Flags().String("body", "", "Request body JSON, @file.json, or @- for stdin (required)")
	cmd.Flags().String("idempotency-key", "", "Idempotency-Key header for safe write retries")
	return cmd
}
