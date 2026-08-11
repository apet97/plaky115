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
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunGetSpace(ctx, cmd, getClient)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().StringArray("expand", nil, "Comma-separated list of relationships to be expanded into full objects.")
	return cmd
}
