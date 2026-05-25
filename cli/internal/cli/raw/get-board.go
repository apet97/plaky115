// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getBoard
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/spf13/cobra"
)

func newGetBoardCmd(getClient ClientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-board",
		Short: "Retrieve a board",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			return plakydx.RunGetBoard(ctx, cmd, client)
		},
	}
	cmd.Flags().String("space-id", "", "spaceId (required)")
	cmd.Flags().String("board-id", "", "boardId (required)")
	return cmd
}
