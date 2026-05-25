// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getSpace
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newGetSpaceCmd(client *plakysdk.Client) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-space",
		Short: "Retrieve a space",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunGetSpace(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "spaceId (required)")
	return cmd
}
