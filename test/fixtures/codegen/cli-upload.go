// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=uploadWidgetFile
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newUploadWidgetFileCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "upload-widget-file",
		Short: "uploadWidgetFile fixture",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunUploadWidgetFile(ctx, cmd, client)
		},
	}
	cmd.Flags().String("widget-id", "", "Widget identifier. (required)")
	cmd.Flags().String("file", "", "File to upload; use - for stdin (required)")
	cmd.Flags().String("filename", "", "Multipart filename; required with --file - and otherwise defaults to the path basename")
	cmd.Flags().String("content-type", "", "Optional file media type, such as application/pdf")
	cmd.Flags().String("idempotency-key", "", "Idempotency-Key header for safe write retries")
	return cmd
}
