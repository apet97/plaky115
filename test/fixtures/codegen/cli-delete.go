// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteWidget
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newDeleteWidgetCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "delete-widget",
		Short: "deleteWidget fixture",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunDeleteWidget(ctx, cmd, getClient)
		},
	}
	cmd.Flags().String("widget-id", "", "Widget identifier. (required)")
	cmd.Flags().Bool("confirm", false, "Confirm execution of this destructive raw operation")
	return cmd
}
