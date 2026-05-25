// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listBoards
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newListBoardsCmd(client *plakysdk.Client) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-boards",
		Short: "List space boards",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			return plakydx.RunListBoards(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "spaceId (required)")
	cmd.Flags().Int("page", 0, "Page number (1-based)")
	cmd.Flags().Int("page-size", 0, "Page size")
	return cmd
}
