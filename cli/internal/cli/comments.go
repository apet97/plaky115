// Curated CLI commands for comments.
package cli

import (
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newCommentsAddCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "comments-add",
		Short: "Add a comment to an item.",
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
			text, err := requiredFlagString(cmd, "text")
			if err != nil {
				return err
			}
			if err := validateIDValues(
				struct{ name, value string }{"space-id", spaceID},
				struct{ name, value string }{"board-id", boardID},
				struct{ name, value string }{"item-id", itemID},
			); err != nil {
				return err
			}
			dry, _ := cmd.Flags().GetBool("dry-run")
			body := map[string]any{"text": text}
			if dry {
				return plakydx.EmitJSON(cmd, map[string]any{
					"dryRun":    true,
					"operation": "createItemComment",
					"payload":   map[string]any{"spaceId": spaceID, "boardId": boardID, "itemId": itemID, "body": body},
				})
			}
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			out, err := c.CreateItemComment(cmd.Context(), plakysdk.CreateItemCommentOptions{
				SpaceId: spaceID,
				BoardId: boardID,
				ItemId:  itemID,
				Body:    body,
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
	cmd.Flags().String("text", "", "Comment text (required)")
	cmd.Flags().Bool("dry-run", false, "Print the plan without calling the API")
	markRequired(cmd, "space-id", "board-id", "item-id", "text")
	return cmd
}

func newCommentsThreadCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "comments-thread",
		Short: "List the comment thread for one item.",
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
			if err := validateIDValues(
				struct{ name, value string }{"space-id", spaceID},
				struct{ name, value string }{"board-id", boardID},
				struct{ name, value string }{"item-id", itemID},
			); err != nil {
				return err
			}
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			out, err := c.ListItemComments(cmd.Context(), plakysdk.ListItemCommentsOptions{
				SpaceId: spaceID,
				BoardId: boardID,
				ItemId:  itemID,
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
	markRequired(cmd, "space-id", "board-id", "item-id")
	return cmd
}
