// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getSpace
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newGetSpaceCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-space",
		Short: "Retrieve a space",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunGetSpace(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Plaky space ID for the target workspace area (required)")
	cmd.Flags().String("expand", "", "Comma-separated list of relationships to be expanded into full objects.")
	return cmd
}
