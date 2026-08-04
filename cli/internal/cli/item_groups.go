// Curated CLI commands for item groups.
package cli

import (
	"fmt"
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newItemGroupsListCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "item-groups-list",
		Short: "List every item group on a board.",
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
			if err := validateIDValues(
				struct{ name, value string }{"space-id", spaceID},
				struct{ name, value string }{"board-id", boardID},
			); err != nil {
				return err
			}
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			groups, err := drainPaged(200, func(page, pageSize int) (any, error) {
				return c.ListItemGroups(cmd.Context(), plakysdk.ListItemGroupsOptions{
					SpaceId: spaceID, BoardId: boardID, Page: page, PageSize: pageSize,
				})
			})
			if err != nil {
				return err
			}
			return plakydx.EmitJSON(cmd, groups)
		},
	}
	cmd.Flags().String("space-id", "", "Space ID (required)")
	cmd.Flags().String("board-id", "", "Board ID (required)")
	markRequired(cmd, "space-id", "board-id")
	return cmd
}

func newItemGroupsCreateCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "item-groups-create",
		Short: "Create an item group from friendly flags.",
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
			title, err := requiredFlagString(cmd, "title")
			if err != nil {
				return err
			}
			color, err := requiredFlagString(cmd, "color")
			if err != nil {
				return err
			}
			if err := validateIDValues(
				struct{ name, value string }{"space-id", spaceID},
				struct{ name, value string }{"board-id", boardID},
			); err != nil {
				return err
			}
			ranking, _ := cmd.Flags().GetString("ranking")
			idempotencyKey, _ := cmd.Flags().GetString("idempotency-key")
			dryRun, _ := cmd.Flags().GetBool("dry-run")
			body := map[string]any{"title": title}
			if color != "" {
				body["color"] = color
			}
			if ranking != "" {
				body["ranking"] = ranking
			}
			payload := map[string]any{"spaceId": spaceID, "boardId": boardID, "body": body}
			if dryRun {
				return plakydx.EmitJSON(cmd, map[string]any{"dryRun": true, "operation": "createItemGroup", "payload": payload})
			}
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			out, err := c.CreateItemGroup(cmd.Context(), plakysdk.CreateItemGroupOptions{
				SpaceId: spaceID, BoardId: boardID, JSONBody: body, IdempotencyKey: idempotencyKey,
			})
			if err != nil {
				return err
			}
			return plakydx.EmitJSON(cmd, out)
		},
	}
	cmd.Flags().String("space-id", "", "Space ID (required)")
	cmd.Flags().String("board-id", "", "Board ID (required)")
	cmd.Flags().String("title", "", "Item group title (required)")
	cmd.Flags().String("color", "", "Item group color (required)")
	cmd.Flags().String("ranking", "", "Optional item group ranking")
	cmd.Flags().String("idempotency-key", "", "Optional Idempotency-Key header")
	cmd.Flags().Bool("dry-run", false, "Print the plan without calling the API")
	markRequired(cmd, "space-id", "board-id", "title", "color")
	return cmd
}

func newItemGroupsArchiveCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "item-groups-archive",
		Short: "Archive an item group by exact ID.",
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
			itemGroupID, err := requiredFlagString(cmd, "item-group-id")
			if err != nil {
				return err
			}
			if err := validateIDValues(
				struct{ name, value string }{"space-id", spaceID},
				struct{ name, value string }{"board-id", boardID},
				struct{ name, value string }{"item-group-id", itemGroupID},
			); err != nil {
				return err
			}
			dryRun, _ := cmd.Flags().GetBool("dry-run")
			payload := map[string]any{"spaceId": spaceID, "boardId": boardID, "itemGroupId": itemGroupID}
			if dryRun {
				return plakydx.EmitJSON(cmd, map[string]any{"dryRun": true, "operation": "archiveItemGroup", "payload": payload})
			}
			confirmed, _ := cmd.Flags().GetBool("confirm")
			if !confirmed {
				return fmt.Errorf("--confirm is required to archive an item group")
			}
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			if err := c.ArchiveItemGroup(cmd.Context(), plakysdk.ArchiveItemGroupOptions{
				SpaceId: spaceID, BoardId: boardID, ItemGroupId: itemGroupID,
			}); err != nil {
				return err
			}
			return plakydx.EmitJSON(cmd, map[string]any{"ok": true})
		},
	}
	cmd.Flags().String("space-id", "", "Space ID (required)")
	cmd.Flags().String("board-id", "", "Board ID (required)")
	cmd.Flags().String("item-group-id", "", "Item group ID (required)")
	cmd.Flags().Bool("dry-run", false, "Print the plan without calling the API")
	cmd.Flags().Bool("confirm", false, "Confirm the archive mutation")
	markRequired(cmd, "space-id", "board-id", "item-group-id")
	return cmd
}
