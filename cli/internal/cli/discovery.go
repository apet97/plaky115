// Curated CLI commands for discovery.
package cli

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newFindCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "find",
		Short: "Find spaces, boards, or items by text fragment.",
		Long:  "Search Plaky records by case-insensitive text. For type=board pass --space-id; for type=item pass --space-id and --board-id.",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			typ, err := requiredFlagString(cmd, "type")
			if err != nil {
				return err
			}
			query, err := cmd.Flags().GetString("query")
			if err != nil {
				return err
			}
			needle := strings.ToLower(query)
			ctx := cmd.Context()
			switch typ {
			case "space":
				c, err := getClient(cmd)
				if err != nil {
					return err
				}
				out, err := drainPaged(200, func(page, pageSize int) (any, error) {
					return c.ListSpaces(ctx, plakysdk.ListSpacesOptions{Page: page, PageSize: pageSize})
				})
				if err != nil {
					return err
				}
				hits, err := filterByTitle(out, needle, "title")
				if err != nil {
					return err
				}
				return plakydx.EmitJSON(cmd, hits)
			case "board":
				spaceID, err := requiredFlagString(cmd, "space-id")
				if err != nil {
					return fmt.Errorf("--space-id required when --type=board")
				}
				if err := validateIDValues(struct{ name, value string }{"space-id", spaceID}); err != nil {
					return err
				}
				c, err := getClient(cmd)
				if err != nil {
					return err
				}
				out, err := drainPaged(200, func(page, pageSize int) (any, error) {
					return c.ListBoards(ctx, plakysdk.ListBoardsOptions{SpaceId: spaceID, Page: page, PageSize: pageSize})
				})
				if err != nil {
					return err
				}
				hits, err := filterByTitle(out, needle, "title")
				if err != nil {
					return err
				}
				return plakydx.EmitJSON(cmd, hits)
			case "item":
				spaceID, err := requiredFlagString(cmd, "space-id")
				if err != nil {
					return fmt.Errorf("--space-id and --board-id required when --type=item")
				}
				boardID, err := requiredFlagString(cmd, "board-id")
				if err != nil {
					return fmt.Errorf("--space-id and --board-id required when --type=item")
				}
				limit, _ := cmd.Flags().GetInt("limit")
				if err := validateIDValues(
					struct{ name, value string }{"space-id", spaceID},
					struct{ name, value string }{"board-id", boardID},
				); err != nil {
					return err
				}
				if limit <= 0 {
					return fmt.Errorf("--limit must be a positive integer")
				}
				c, err := getClient(cmd)
				if err != nil {
					return err
				}
				return emitDetailedItemSearch(cmd, c, spaceID, boardID, needle, limit)
			default:
				return fmt.Errorf("--type must be one of: space, board, item")
			}
		},
	}
	cmd.Flags().String("type", "", "One of: space | board | item (required)")
	cmd.Flags().String("query", "", "Case-insensitive needle (required)")
	cmd.Flags().String("space-id", "", "Required when type=board or type=item")
	cmd.Flags().String("board-id", "", "Required when type=item")
	cmd.Flags().Int("limit", 200, "Maximum items to scan when type=item")
	markRequired(cmd, "type", "query")
	return cmd
}

func emitDetailedItemSearch(cmd *cobra.Command, c *plakysdk.Client, spaceID, boardID, needle string, limit int) error {
	ctx := cmd.Context()
	hits := []map[string]any{}
	scanned := 0
	for page := 1; scanned < limit; page++ {
		pageSize := min(200, limit-scanned)
		raw, err := c.ListItems(ctx, plakysdk.ListItemsOptions{SpaceId: spaceID, BoardId: boardID, Page: page, PageSize: pageSize})
		if err != nil {
			return err
		}
		_, batch, hasMore, err := plakydx.RequirePage(raw, "search items")
		if err != nil {
			return err
		}
		remaining := limit - scanned
		if len(batch) > remaining {
			batch = batch[:remaining]
		}
		for _, value := range batch {
			item, err := plakydx.RequireRecord(value, "search item")
			if err != nil {
				return err
			}
			scanned++
			if itemMatchesSearch(item, needle) {
				hits = append(hits, map[string]any{"id": item["id"], "title": item["title"]})
			}
		}
		if !hasMore {
			return plakydx.EmitJSON(cmd, map[string]any{
				"data": hits, "scanned": scanned, "matched": len(hits), "truncated": false,
			})
		}
		if scanned >= limit {
			return plakydx.EmitJSON(cmd, map[string]any{
				"data": hits, "scanned": scanned, "matched": len(hits), "truncated": true, "nextPage": page + 1,
			})
		}
		if len(batch) == 0 {
			return fmt.Errorf("item search page %d was empty while hasMore was true", page)
		}
	}
	return nil
}

func itemMatchesSearch(item map[string]any, needle string) bool {
	if title, _ := item["title"].(string); strings.Contains(strings.ToLower(title), needle) {
		return true
	}
	fields, _ := item["fields"].([]any)
	for _, value := range fields {
		field := plakydx.AsRecord(value)
		for _, text := range searchableScalars(field["value"]) {
			if strings.Contains(strings.ToLower(text), needle) {
				return true
			}
		}
	}
	return false
}

func searchableScalars(value any) []string {
	switch typed := value.(type) {
	case string:
		return []string{typed}
	case float64, bool, json.Number:
		return []string{fmt.Sprint(typed)}
	case []any:
		out := []string{}
		for _, entry := range typed {
			out = append(out, searchableScalars(entry)...)
		}
		return out
	case map[string]any:
		keys := make([]string, 0, len(typed))
		for key := range typed {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		out := []string{}
		for _, key := range keys {
			out = append(out, searchableScalars(typed[key])...)
		}
		return out
	default:
		return nil
	}
}

func newFieldsListCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "fields-list",
		Short: "List field definitions for a board.",
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
			showConfig, _ := cmd.Flags().GetBool("show-config")
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			out, err := c.GetBoard(cmd.Context(), plakysdk.GetBoardOptions{SpaceId: spaceID, BoardId: boardID})
			if err != nil {
				return err
			}
			board, err := plakydx.RequireRecord(out, "get board")
			if err != nil {
				return err
			}
			fields, _ := board["fields"].([]any)
			compact := make([]map[string]any, 0, len(fields))
			for _, f := range fields {
				m, err := plakydx.RequireRecord(f, "board field")
				if err != nil {
					return err
				}
				row := map[string]any{}
				for _, k := range []string{"id", "key", "name", "title", "type", "description"} {
					if v, ok := m[k]; ok && v != nil {
						row[k] = v
					}
				}
				// Surface the human label under a stable "label" key whichever
				// of name/title the API used. Lets agents key off one field.
				if v, ok := row["name"]; ok {
					row["label"] = v
				} else if v, ok := row["title"]; ok {
					row["label"] = v
				}
				if showConfig {
					if v, ok := m["configuration"]; ok {
						row["configuration"] = v
					}
				}
				compact = append(compact, row)
			}
			return plakydx.EmitJSON(cmd, compact)
		},
	}
	cmd.Flags().String("space-id", "", "Space ID (required)")
	cmd.Flags().String("board-id", "", "Board ID (required)")
	cmd.Flags().Bool("show-config", false, "Include the full field configuration block (large)")
	markRequired(cmd, "space-id", "board-id")
	return cmd
}
