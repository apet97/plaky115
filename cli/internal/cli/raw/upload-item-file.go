// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=uploadItemFile
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newUploadItemFileCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:         "upload-item-file",
		Short:       "Upload an item file",
		Annotations: map[string]string{"plaky115.stdin-consumer": "file"},
		Args:        cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunUploadItemFile(ctx, cmd, getClient)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().String("board-id", "", "Represents unique board identifier across the system. (required)")
	cmd.Flags().String("item-id", "", "Represents unique item identifier across the system. (required)")
	cmd.Flags().String("file", "", "File to upload; use - for stdin (required)")
	cmd.Flags().String("filename", "", "Multipart filename; required with --file - and otherwise defaults to the path basename")
	cmd.Flags().String("content-type", "", "Optional file media type, such as application/pdf")
	cmd.Flags().String("idempotency-key", "", "Idempotency-Key header for safe write retries")
	return cmd
}
