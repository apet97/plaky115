// Curated CLI commands for workspace.
package cli

import (
	"fmt"
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newWorkspaceMapCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "workspace-map",
		Short: "List spaces with their boards (compact tree).",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			data, err := drainPaged(200, func(page, pageSize int) (any, error) {
				return c.ListSpaces(ctx, plakysdk.ListSpacesOptions{Expand: []string{"board"}, Page: page, PageSize: pageSize})
			})
			if err != nil {
				return err
			}
			out := []map[string]any{}
			for _, s := range data {
				m := s
				boards, expanded := m["boards"].([]any)
				if !expanded {
					idStr, err := mustID(m["id"])
					if err != nil {
						return fmt.Errorf("space id: %w", err)
					}
					if idStr == "" {
						boards = []any{}
					} else {
						fallback, err := drainPaged(200, func(page, pageSize int) (any, error) {
							return c.ListBoards(ctx, plakysdk.ListBoardsOptions{SpaceId: idStr, Page: page, PageSize: pageSize})
						})
						if err != nil {
							return fmt.Errorf("list boards for space %s: %w", idStr, err)
						}
						boards = make([]any, 0, len(fallback))
						for _, board := range fallback {
							boards = append(boards, board)
						}
					}
				}
				compactBoards := make([]map[string]any, 0, len(boards))
				for _, b := range boards {
					compactBoards = append(compactBoards, plakydx.CompactBoard(b))
				}
				out = append(out, map[string]any{
					"id":     m["id"],
					"title":  m["title"],
					"boards": compactBoards,
				})
			}
			return plakydx.EmitJSON(cmd, out)
		},
	}
	return cmd
}
