// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getWidget
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newGetWidgetCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-widget",
		Short: "getWidget fixture",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunGetWidget(ctx, cmd, client)
		},
	}
	cmd.Flags().String("widget-id", "", "Widget identifier. Required by the API. (required)")
	cmd.Flags().String("status", "", "Status filter. Allowed values: OPEN, DONE.")
	cmd.Flags().Int("limit", 0, "Result limit.")
	cmd.Flags().Int64("cursor", 0, "Numeric cursor.")
	cmd.Flags().StringArray("labels", nil, "Labels to match.")
	return cmd
}
