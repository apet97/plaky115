// Curated CLI commands for reactions.
package cli

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newReactionsReplaceCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "reactions-replace",
		Short: "Replace reactions for one item comment.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			spaceID, _ := cmd.Flags().GetString("space-id")
			boardID, _ := cmd.Flags().GetString("board-id")
			itemID, _ := cmd.Flags().GetString("item-id")
			commentID, _ := cmd.Flags().GetString("comment-id")
			bodyText, _ := cmd.Flags().GetString("body")
			dry, _ := cmd.Flags().GetBool("dry-run")
			body, err := plakydx.ParseBody(cmd, bodyText)
			if err != nil {
				return err
			}
			if dry {
				return plakydx.EmitJSON(cmd, map[string]any{
					"dryRun":    true,
					"operation": "replaceCommentReactions",
					"payload": map[string]any{
						"spaceId":   spaceID,
						"boardId":   boardID,
						"itemId":    itemID,
						"commentId": commentID,
						"body":      body,
					},
				})
			}
			out, err := c.ReplaceCommentReactions(cmd.Context(), plakysdk.ReplaceCommentReactionsOptions{
				SpaceId:       spaceID,
				BoardId:       boardID,
				ItemId:        itemID,
				ItemCommentId: commentID,
				Body:          body,
			})
			if err != nil {
				return err
			}
			return plakydx.EmitJSON(cmd, out)
		},
	}
	cmd.Flags().String("space-id", "", "Space ID (required)")
	cmd.Flags().String("board-id", "", "Board ID (required)")
	cmd.Flags().String("item-id", "", "Item ID (required)")
	cmd.Flags().String("comment-id", "", "Comment ID (required)")
	cmd.Flags().String("body", "", "Request body JSON, @file.json, or @- for stdin (required)")
	cmd.Flags().Bool("dry-run", false, "Print the plan without calling the API")
	markRequired(cmd, "space-id", "board-id", "item-id", "comment-id", "body")
	return cmd
}
