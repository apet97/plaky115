// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listBoards
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newListBoardsCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-boards",
		Short: "List space boards",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunListBoards(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "Represents unique space identifier across the system. (required)")
	cmd.Flags().Int("page", 0, "Page number.")
	cmd.Flags().Int("page-size", 0, "Page size.")
	return cmd
}
