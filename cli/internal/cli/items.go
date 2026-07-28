// Curated CLI commands for items.
package cli

import (
	"encoding/json"
	"fmt"
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
	"os"
)

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
	markRequired(cmd, "space-id", "board-id", "title")
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
			validationErrors := make([]string, len(updates))
			hasInvalid := false
			for i, u := range updates {
				if u.SpaceId == "" || u.BoardId == "" || u.ItemId == "" {
					validationErrors[i] = "spaceId, boardId, and itemId are required"
					hasInvalid = true
					continue
				}
				for _, field := range []struct{ name, value string }{
					{"spaceId", u.SpaceId},
					{"boardId", u.BoardId},
					{"itemId", u.ItemId},
				} {
					if _, err := canonicalInt64(field.value); err != nil {
						validationErrors[i] = fmt.Sprintf("%s: %s", field.name, err)
						hasInvalid = true
						break
					}
				}
			}
			results := []map[string]any{}
			for i, u := range updates {
				// Pre-validate identifiers before any API call so a bad entry is
				// reported as "invalid" up front rather than failing soft against
				// the API (or, in dry-run, masking a malformed entry as planned).
				if validationErrors[i] != "" {
					results = append(results, map[string]any{"itemId": u.ItemId, "status": "invalid", "detail": validationErrors[i]})
					continue
				}
				if hasInvalid {
					results = append(results, map[string]any{"itemId": u.ItemId, "status": "not-run", "detail": "batch contains invalid identifiers"})
					continue
				}
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
	markRequired(cmd, "file")
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
			csvSafety, _ := cmd.Flags().GetString("csv-safety")
			if format != "jsonl" && format != "csv" {
				return fmt.Errorf("--format must be jsonl or csv")
			}
			if csvSafety != "spreadsheet" && csvSafety != "raw" {
				return fmt.Errorf("--csv-safety must be spreadsheet or raw")
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
			return writeCSV(cmd, items, csvSafety)
		},
	}
	cmd.Flags().String("space-id", "", "Space ID (required)")
	cmd.Flags().String("board-id", "", "Board ID (required)")
	cmd.Flags().String("format", "jsonl", "Output format: jsonl | csv")
	cmd.Flags().String("csv-safety", "spreadsheet", "CSV string safety: spreadsheet | raw")
	markRequired(cmd, "space-id", "board-id")
	return cmd
}

func drainItems(cmd *cobra.Command, c *plakysdk.Client, spaceID, boardID string) ([]map[string]any, error) {
	ctx := cmd.Context()
	return drainPaged(200, func(page, pageSize int) (any, error) {
		return c.ListItems(ctx, plakysdk.ListItemsOptions{SpaceId: spaceID, BoardId: boardID, Page: page, PageSize: pageSize})
	})
}

// maxPaginationPages is a safety valve, not an API contract: it bounds an
// otherwise unbounded paging loop so a server that always reports
// `hasMore: true` cannot spin forever. Kept in lockstep with the SDK's
// MAX_PAGES (sdk/src/runtime/pagination.ts). Not configurable. See
// docs/api-behavior.md.
const maxPaginationPages = 10_000
