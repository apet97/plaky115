// Curated CLI commands for items.
package cli

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func newItemsCreateSimpleCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "items-create-simple",
		Short: "Create an item with just a title (and optional --dry-run).",
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
			if err := validateIDValues(
				struct{ name, value string }{"space-id", spaceID},
				struct{ name, value string }{"board-id", boardID},
			); err != nil {
				return err
			}
			dry, _ := cmd.Flags().GetBool("dry-run")
			body := map[string]any{"title": title}
			if dry {
				return plakydx.EmitJSON(cmd, map[string]any{
					"dryRun":    true,
					"operation": "createItem",
					"payload":   map[string]any{"spaceId": spaceID, "boardId": boardID, "body": body},
				})
			}
			c, err := getClient(cmd)
			if err != nil {
				return err
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
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			file, err := requiredFlagString(cmd, "file")
			if err != nil {
				return err
			}
			dry, _ := cmd.Flags().GetBool("dry-run")
			updates, validationErrors, err := parseBulkUpdates(cmd, file)
			if err != nil {
				return err
			}
			hasInvalid := false
			for _, detail := range validationErrors {
				if detail != "" {
					hasInvalid = true
					break
				}
			}
			var c *plakysdk.Client
			if !hasInvalid && !dry {
				c, err = getClient(cmd)
				if err != nil {
					return err
				}
			}
			results := []map[string]any{}
			for i, u := range updates {
				// Pre-validate identifiers before any API call so a bad entry is
				// reported as "invalid" up front rather than failing soft against
				// the API (or, in dry-run, masking a malformed entry as planned).
				if validationErrors[i] != "" {
					results = append(results, map[string]any{"itemId": u.ItemID, "status": "invalid", "detail": validationErrors[i]})
					continue
				}
				if hasInvalid {
					results = append(results, map[string]any{"itemId": u.ItemID, "status": "not-run", "detail": "batch contains invalid identifiers"})
					continue
				}
				if dry {
					results = append(results, map[string]any{"itemId": u.ItemID, "status": "dry-run"})
					continue
				}
				_, err := c.UpdateItemFields(cmd.Context(), plakysdk.UpdateItemFieldsOptions{
					SpaceId: u.SpaceID,
					BoardId: u.BoardID,
					ItemId:  u.ItemID,
					Body:    u.Body,
				})
				if err != nil {
					results = append(results, map[string]any{"itemId": u.ItemID, "status": "error", "detail": FormatError(err)})
					continue
				}
				results = append(results, map[string]any{"itemId": u.ItemID, "status": "updated"})
			}
			return plakydx.EmitJSON(cmd, results)
		},
	}
	cmd.Flags().String("file", "", "Path to JSON file (required)")
	cmd.Flags().Bool("dry-run", false, "Print per-item plan instead of writing")
	markStdinConsumer(cmd, "file")
	markRequired(cmd, "file")
	return cmd
}

type bulkUpdate struct {
	SpaceID string
	BoardID string
	ItemID  string
	Body    map[string]any
}

func parseBulkUpdates(cmd *cobra.Command, file string) ([]bulkUpdate, []string, error) {
	raw := "@" + file
	if file == "-" {
		raw = "@-"
	}
	value, err := plakydx.ParseBody(cmd, raw)
	if err != nil {
		return nil, nil, err
	}
	entries, ok := value.([]any)
	if !ok {
		return nil, nil, fmt.Errorf("bulk input must be a JSON array")
	}
	updates := make([]bulkUpdate, len(entries))
	validationErrors := make([]string, len(entries))
	for index, entry := range entries {
		path := fmt.Sprintf("bulk update /%d", index)
		record, ok := entry.(map[string]any)
		if !ok {
			validationErrors[index] = path + ": expected JSON object"
			continue
		}
		var details []string
		updates[index].SpaceID, details = bulkID(record, "spaceId", path, details)
		updates[index].BoardID, details = bulkID(record, "boardId", path, details)
		updates[index].ItemID, details = bulkID(record, "itemId", path, details)
		body, present := record["body"]
		if !present {
			details = append(details, path+"/body: required")
		} else if typed, ok := body.(map[string]any); ok {
			updates[index].Body = typed
		} else {
			details = append(details, path+"/body: expected JSON object")
		}
		if len(details) > 0 {
			validationErrors[index] = strings.Join(details, "; ")
		}
	}
	return updates, validationErrors, nil
}

func bulkID(record map[string]any, field, path string, details []string) (string, []string) {
	value, present := record[field]
	if !present {
		return "", append(details, path+"/"+field+": required")
	}
	id, err := mustID(value)
	if err != nil {
		return "", append(details, path+"/"+field+": invalid ID")
	}
	return id, details
}

func newItemsExportCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "items-export",
		Short: "Export all items on a board as JSONL or CSV.",
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
			format, _ := cmd.Flags().GetString("format")
			csvSafety, _ := cmd.Flags().GetString("csv-safety")
			if format != "jsonl" && format != "csv" {
				return fmt.Errorf("--format must be jsonl or csv")
			}
			if csvSafety != "spreadsheet" && csvSafety != "raw" {
				return fmt.Errorf("--csv-safety must be spreadsheet or raw")
			}
			c, err := getClient(cmd)
			if err != nil {
				return err
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
