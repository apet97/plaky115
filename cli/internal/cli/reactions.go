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
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			spaceID, err := requiredFlagString(cmd, "space-id")
			if err != nil {
				return err
			}
			boardID, err := requiredFlagString(cmd, "board-id")
			if err != nil {
				return err
			}
			itemID, err := requiredFlagString(cmd, "item-id")
			if err != nil {
				return err
			}
			commentID, err := requiredFlagString(cmd, "comment-id")
			if err != nil {
				return err
			}
			bodyText, err := requiredFlagString(cmd, "body")
			if err != nil {
				return err
			}
			if err := validateIDValues(
				struct{ name, value string }{"space-id", spaceID},
				struct{ name, value string }{"board-id", boardID},
				struct{ name, value string }{"item-id", itemID},
				struct{ name, value string }{"comment-id", commentID},
			); err != nil {
				return err
			}
			dry, _ := cmd.Flags().GetBool("dry-run")
			body, err := plakydx.ParseJSONBody(cmd, bodyText, true, "reactions")
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
			c, err := getClient(cmd)
			if err != nil {
				return err
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
	markStdinConsumer(cmd, "body")
	markRequired(cmd, "space-id", "board-id", "item-id", "comment-id", "body")
	return cmd
}
