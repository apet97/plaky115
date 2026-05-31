// Curated CLI commands: small, polished workflows on top of plakysdk.
// This file is hand-crafted. Add new curated commands here, then wire them
// in NewRootCommand.
package cli

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sort"
	"strings"

	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newWorkspaceMapCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "workspace-map",
		Short: "List spaces with their boards (compact tree).",
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			data, err := drainPaged(200, func(page, pageSize int) (any, error) {
				return c.ListSpaces(ctx, plakysdk.ListSpacesOptions{Page: page, PageSize: pageSize})
			})
			if err != nil {
				return err
			}
			out := []map[string]any{}
			for _, s := range data {
				m := s
				idStr, _ := mustID(m["id"])
				if idStr == "" {
					continue
				}
				boards, err := drainPaged(200, func(page, pageSize int) (any, error) {
					return c.ListBoards(ctx, plakysdk.ListBoardsOptions{SpaceId: idStr, Page: page, PageSize: pageSize})
				})
				if err != nil {
					return fmt.Errorf("list boards for space %s: %w", idStr, err)
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

func newItemsCreateSimpleCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "items-create-simple",
		Short: "Create an item with just a title (and optional --dry-run).",
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			spaceID, _ := cmd.Flags().GetString("space-id")
			boardID, _ := cmd.Flags().GetString("board-id")
			title, _ := cmd.Flags().GetString("title")
			dry, _ := cmd.Flags().GetBool("dry-run")
			if spaceID == "" || boardID == "" || title == "" {
				return fmt.Errorf("--space-id, --board-id, and --title are required")
			}
			body := map[string]any{"title": title}
			if dry {
				return plakydx.EmitJSON(cmd, map[string]any{
					"dryRun":    true,
					"operation": "createItem",
					"payload":   map[string]any{"spaceId": spaceID, "boardId": boardID, "body": body},
				})
			}
			out, err := c.CreateItem(cmd.Context(), plakysdk.CreateItemOptions{
				SpaceId: spaceID,
				BoardId: boardID,
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
	cmd.Flags().String("title", "", "Item title (required)")
	cmd.Flags().Bool("dry-run", false, "Print the plan without calling the API")
	return cmd
}

func newCommentsAddCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "comments-add",
		Short: "Add a comment to an item.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			spaceID, _ := cmd.Flags().GetString("space-id")
			boardID, _ := cmd.Flags().GetString("board-id")
			itemID, _ := cmd.Flags().GetString("item-id")
			text, _ := cmd.Flags().GetString("text")
			dry, _ := cmd.Flags().GetBool("dry-run")
			if spaceID == "" || boardID == "" || itemID == "" || text == "" {
				return fmt.Errorf("--space-id, --board-id, --item-id, --text are required")
			}
			body := map[string]any{"text": text}
			if dry {
				return plakydx.EmitJSON(cmd, map[string]any{
					"dryRun":    true,
					"operation": "createItemComment",
					"payload":   map[string]any{"spaceId": spaceID, "boardId": boardID, "itemId": itemID, "body": body},
				})
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
	return cmd
}

func newCommentsThreadCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "comments-thread",
		Short: "List the comment thread for one item.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			spaceID, _ := cmd.Flags().GetString("space-id")
			boardID, _ := cmd.Flags().GetString("board-id")
			itemID, _ := cmd.Flags().GetString("item-id")
			if spaceID == "" || boardID == "" || itemID == "" {
				return fmt.Errorf("--space-id, --board-id, and --item-id are required")
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
	return cmd
}

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
			if spaceID == "" || boardID == "" || itemID == "" || commentID == "" || bodyText == "" {
				return fmt.Errorf("--space-id, --board-id, --item-id, --comment-id, and --body are required")
			}
			body, err := parseBodyValue(cmd, bodyText)
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
	return cmd
}

func newItemsBulkUpdateCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "items-bulk-update",
		Short: "Update many items in one pass from a JSON file (dry-run aware).",
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			file, _ := cmd.Flags().GetString("file")
			dry, _ := cmd.Flags().GetBool("dry-run")
			if file == "" {
				return fmt.Errorf("--file is required (JSON array of {spaceId, boardId, itemId, body})")
			}
			raw, err := os.ReadFile(file)
			if err != nil {
				return err
			}
			var updates []struct {
				SpaceId string         `json:"spaceId"`
				BoardId string         `json:"boardId"`
				ItemId  string         `json:"itemId"`
				Body    map[string]any `json:"body"`
			}
			if err := json.Unmarshal(raw, &updates); err != nil {
				return fmt.Errorf("invalid JSON: %w", err)
			}
			results := []map[string]any{}
			for _, u := range updates {
				if dry {
					results = append(results, map[string]any{"itemId": u.ItemId, "status": "dry-run"})
					continue
				}
				_, err := c.UpdateItemFields(cmd.Context(), plakysdk.UpdateItemFieldsOptions{
					SpaceId: u.SpaceId,
					BoardId: u.BoardId,
					ItemId:  u.ItemId,
					Body:    u.Body,
				})
				if err != nil {
					results = append(results, map[string]any{"itemId": u.ItemId, "status": "error", "detail": FormatError(err)})
					continue
				}
				results = append(results, map[string]any{"itemId": u.ItemId, "status": "updated"})
			}
			return plakydx.EmitJSON(cmd, results)
		},
	}
	cmd.Flags().String("file", "", "Path to JSON file (required)")
	cmd.Flags().Bool("dry-run", false, "Print per-item plan instead of writing")
	return cmd
}

func parseBodyValue(cmd *cobra.Command, raw string) (any, error) {
	if raw == "@-" {
		b, err := io.ReadAll(cmd.InOrStdin())
		if err != nil {
			return nil, fmt.Errorf("read --body @-: %w", err)
		}
		raw = string(b)
	} else if strings.HasPrefix(raw, "@") {
		b, err := os.ReadFile(strings.TrimPrefix(raw, "@"))
		if err != nil {
			return nil, fmt.Errorf("read --body file: %w", err)
		}
		raw = string(b)
	}
	var body any
	if err := json.Unmarshal([]byte(raw), &body); err != nil {
		return nil, fmt.Errorf("invalid --body JSON: %w", err)
	}
	return body, nil
}

func newCompletionCommand(root *cobra.Command) *cobra.Command {
	cmd := &cobra.Command{
		Use:                   "completion [bash|zsh|fish|powershell]",
		Short:                 "Generate shell completion script.",
		DisableFlagsInUseLine: true,
		ValidArgs:             []string{"bash", "zsh", "fish", "powershell"},
		Args:                  cobra.MatchAll(cobra.ExactArgs(1), cobra.OnlyValidArgs),
		RunE: func(cmd *cobra.Command, args []string) error {
			switch args[0] {
			case "bash":
				return root.GenBashCompletion(cmd.OutOrStdout())
			case "zsh":
				return root.GenZshCompletion(cmd.OutOrStdout())
			case "fish":
				return root.GenFishCompletion(cmd.OutOrStdout(), true)
			case "powershell":
				return root.GenPowerShellCompletion(cmd.OutOrStdout())
			}
			return nil
		},
	}
	return cmd
}

// mustID returns the string form of a JSON id (number or string).
func mustID(v any) (string, error) {
	switch t := v.(type) {
	case string:
		return t, nil
	case float64:
		return fmt.Sprintf("%d", int64(t)), nil
	case int:
		return fmt.Sprintf("%d", t), nil
	case int64:
		return fmt.Sprintf("%d", t), nil
	default:
		return "", fmt.Errorf("unexpected id type %T", v)
	}
}

func newFindCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "find",
		Short: "Find spaces, boards, or items by text fragment.",
		Long:  "Search Plaky records by case-insensitive text. For type=board pass --space-id; for type=item pass --space-id and --board-id.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			typ, _ := cmd.Flags().GetString("type")
			query, _ := cmd.Flags().GetString("query")
			if typ == "" || query == "" {
				return fmt.Errorf("--type and --query are required")
			}
			needle := strings.ToLower(query)
			ctx := cmd.Context()
			switch typ {
			case "space":
				out, err := drainPaged(200, func(page, pageSize int) (any, error) {
					return c.ListSpaces(ctx, plakysdk.ListSpacesOptions{Page: page, PageSize: pageSize})
				})
				if err != nil {
					return err
				}
				return plakydx.EmitJSON(cmd, filterByTitle(out, needle, "title"))
			case "board":
				spaceID, _ := cmd.Flags().GetString("space-id")
				if spaceID == "" {
					return fmt.Errorf("--space-id required when --type=board")
				}
				out, err := drainPaged(200, func(page, pageSize int) (any, error) {
					return c.ListBoards(ctx, plakysdk.ListBoardsOptions{SpaceId: spaceID, Page: page, PageSize: pageSize})
				})
				if err != nil {
					return err
				}
				return plakydx.EmitJSON(cmd, filterByTitle(out, needle, "title"))
			case "item":
				spaceID, _ := cmd.Flags().GetString("space-id")
				boardID, _ := cmd.Flags().GetString("board-id")
				if spaceID == "" || boardID == "" {
					return fmt.Errorf("--space-id and --board-id required when --type=item")
				}
				out, err := drainPaged(200, func(page, pageSize int) (any, error) {
					return c.ListItems(ctx, plakysdk.ListItemsOptions{SpaceId: spaceID, BoardId: boardID, Page: page, PageSize: pageSize})
				})
				if err != nil {
					return err
				}
				return plakydx.EmitJSON(cmd, filterByTitle(out, needle, "title"))
			default:
				return fmt.Errorf("--type must be one of: space, board, item")
			}
		},
	}
	cmd.Flags().String("type", "", "One of: space | board | item (required)")
	cmd.Flags().String("query", "", "Case-insensitive needle (required)")
	cmd.Flags().String("space-id", "", "Required when type=board or type=item")
	cmd.Flags().String("board-id", "", "Required when type=item")
	return cmd
}

func newFieldsListCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "fields-list",
		Short: "List field definitions for a board.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			spaceID, _ := cmd.Flags().GetString("space-id")
			boardID, _ := cmd.Flags().GetString("board-id")
			showConfig, _ := cmd.Flags().GetBool("show-config")
			if spaceID == "" || boardID == "" {
				return fmt.Errorf("--space-id and --board-id are required")
			}
			out, err := c.GetBoard(cmd.Context(), plakysdk.GetBoardOptions{SpaceId: spaceID, BoardId: boardID})
			if err != nil {
				return err
			}
			board := plakydx.AsRecord(out)
			fields, _ := board["fields"].([]any)
			compact := make([]map[string]any, 0, len(fields))
			for _, f := range fields {
				m := plakydx.AsRecord(f)
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
	return cmd
}

func newItemsExportCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "items-export",
		Short: "Export all items on a board as JSONL or CSV.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			spaceID, _ := cmd.Flags().GetString("space-id")
			boardID, _ := cmd.Flags().GetString("board-id")
			format, _ := cmd.Flags().GetString("format")
			if spaceID == "" || boardID == "" {
				return fmt.Errorf("--space-id and --board-id are required")
			}
			if format != "jsonl" && format != "csv" {
				return fmt.Errorf("--format must be jsonl or csv")
			}
			items, err := drainItems(cmd, c, spaceID, boardID)
			if err != nil {
				return err
			}
			if format == "jsonl" {
				w := cmd.OutOrStdout()
				for _, it := range items {
					b, err := json.Marshal(it)
					if err != nil {
						return err
					}
					if _, err := fmt.Fprintln(w, string(b)); err != nil {
						return err
					}
				}
				return nil
			}
			return writeCSV(cmd, items)
		},
	}
	cmd.Flags().String("space-id", "", "Space ID (required)")
	cmd.Flags().String("board-id", "", "Board ID (required)")
	cmd.Flags().String("format", "jsonl", "Output format: jsonl | csv")
	return cmd
}

func drainItems(cmd *cobra.Command, c *plakysdk.Client, spaceID, boardID string) ([]map[string]any, error) {
	ctx := cmd.Context()
	return drainPaged(200, func(page, pageSize int) (any, error) {
		return c.ListItems(ctx, plakysdk.ListItemsOptions{SpaceId: spaceID, BoardId: boardID, Page: page, PageSize: pageSize})
	})
}

func writeCSV(cmd *cobra.Command, items []map[string]any) error {
	w := csv.NewWriter(cmd.OutOrStdout())
	defer w.Flush()
	if len(items) == 0 {
		return nil
	}
	keys := map[string]struct{}{}
	for _, it := range items {
		for k := range it {
			keys[k] = struct{}{}
		}
	}
	header := make([]string, 0, len(keys))
	for k := range keys {
		header = append(header, k)
	}
	sort.Strings(header)
	if err := w.Write(header); err != nil {
		return err
	}
	for _, it := range items {
		row := make([]string, len(header))
		for i, k := range header {
			row[i] = stringify(it[k])
		}
		if err := w.Write(row); err != nil {
			return err
		}
	}
	return nil
}

func stringify(v any) string {
	if v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	case float64:
		if t == float64(int64(t)) {
			return fmt.Sprintf("%d", int64(t))
		}
		return fmt.Sprintf("%g", t)
	case bool:
		if t {
			return "true"
		}
		return "false"
	default:
		b, err := json.Marshal(v)
		if err != nil {
			return ""
		}
		return string(b)
	}
}

func drainPaged(pageSize int, fetch func(page int, pageSize int) (any, error)) ([]map[string]any, error) {
	all := []map[string]any{}
	for page := 1; ; page++ {
		raw, err := fetch(page, pageSize)
		if err != nil {
			return nil, err
		}
		r := plakydx.AsRecord(raw)
		batch, _ := r["data"].([]any)
		for _, item := range batch {
			all = append(all, plakydx.AsRecord(item))
		}
		if hasMore, _ := r["hasMore"].(bool); !hasMore {
			return all, nil
		}
		if page >= 1000 {
			return nil, fmt.Errorf("pagination aborted after 1000 pages")
		}
	}
}

func filterByTitle(raw any, needle, key string) []map[string]any {
	var data []map[string]any
	switch typed := raw.(type) {
	case []map[string]any:
		data = typed
	default:
		r := plakydx.AsRecord(raw)
		batch, _ := r["data"].([]any)
		for _, item := range batch {
			data = append(data, plakydx.AsRecord(item))
		}
	}
	hits := []map[string]any{}
	for _, item := range data {
		m := item
		title, _ := m[key].(string)
		if title == "" {
			title, _ = m["name"].(string)
		}
		if strings.Contains(strings.ToLower(title), needle) {
			hits = append(hits, map[string]any{
				"id": m["id"],
				key:  m[key],
			})
		}
	}
	return hits
}
