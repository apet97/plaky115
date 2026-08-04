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
			page, _ := cmd.Flags().GetInt("page")
			pageIndex, _ := cmd.Flags().GetInt("page-index")
			pageSize, _ := cmd.Flags().GetInt("page-size")
			maxItems, _ := cmd.Flags().GetInt64("max-items")
			maxBytes, _ := cmd.Flags().GetInt64("max-bytes")
			if page < 1 {
				return fmt.Errorf("--page must be at least 1")
			}
			if pageIndex < 0 {
				return fmt.Errorf("--page-index must be non-negative")
			}
			if pageSize < 1 {
				return fmt.Errorf("--page-size must be at least 1")
			}
			if maxItems < 1 {
				return fmt.Errorf("--max-items must be at least 1")
			}
			if maxBytes < 1 {
				return fmt.Errorf("--max-bytes must be at least 1")
			}
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			return streamItemsExport(cmd, c, spaceID, boardID, format, csvSafety, page, pageIndex, pageSize, maxItems, maxBytes)
		},
	}
	cmd.Flags().String("space-id", "", "Space ID (required)")
	cmd.Flags().String("board-id", "", "Board ID (required)")
	cmd.Flags().String("format", "jsonl", "Output format: jsonl | csv")
	cmd.Flags().String("csv-safety", "spreadsheet", "CSV string safety: spreadsheet | raw")
	cmd.Flags().Int("page", 1, "First API page or continuation page")
	cmd.Flags().Int("page-index", 0, "Zero-based item index within the first continuation page")
	cmd.Flags().Int("page-size", 200, "API page size")
	cmd.Flags().Int64("max-items", 10_000, "Maximum items to emit")
	cmd.Flags().Int64("max-bytes", 16*1024*1024, "Maximum UTF-8 output bytes")
	markRequired(cmd, "space-id", "board-id")
	return cmd
}

func streamItemsExport(cmd *cobra.Command, c *plakysdk.Client, spaceID, boardID, format, csvSafety string, page, pageIndex, pageSize int, maxItems, maxBytes int64) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()
	var csvState csvSchema
	csvHeaderWritten := false
	var outputBytes int64
	var emitted int64
	var board any

	if format == "csv" {
		var err error
		board, err = c.GetBoard(ctx, plakysdk.GetBoardOptions{SpaceId: spaceID, BoardId: boardID})
		if err != nil {
			return err
		}
	}

	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		raw, err := c.ListItems(ctx, plakysdk.ListItemsOptions{SpaceId: spaceID, BoardId: boardID, Page: page, PageSize: pageSize})
		if err != nil {
			return err
		}
		_, batch, hasMore, err := plakydx.RequirePage(raw, "items export response")
		if err != nil {
			return err
		}
		if pageIndex > len(batch) {
			return fmt.Errorf("items export continuation index %d exceeds page %d length", pageIndex, page)
		}

		if format == "csv" && !csvHeaderWritten && len(batch) > 0 {
			seed, err := recordsFromBatch(batch, "items export CSV schema")
			if err != nil {
				return err
			}
			csvState = buildCSVSchema(seed, board)
			header, err := renderCSVHeader(csvState)
			if err != nil {
				return err
			}
			if int64(len(header)) > maxBytes {
				return fmt.Errorf("items export truncated: max-bytes=%d next-page=%d next-index=%d", maxBytes, page, pageIndex)
			}
			if _, err := out.Write(header); err != nil {
				return err
			}
			outputBytes += int64(len(header))
			csvHeaderWritten = true
		}

		for index := pageIndex; index < len(batch); index++ {
			if err := ctx.Err(); err != nil {
				return err
			}
			if emitted >= maxItems {
				return exportTruncated(maxItems, maxBytes, page, index)
			}
			record, err := plakydx.RequireRecord(batch[index], "items export item")
			if err != nil {
				return err
			}
			var encoded []byte
			if format == "jsonl" {
				encoded, err = json.Marshal(record)
				if err != nil {
					return err
				}
				encoded = append(encoded, '\n')
			} else {
				encoded, err = renderCSVRow(record, csvState, csvSafety)
				if err != nil {
					return err
				}
			}
			if outputBytes+int64(len(encoded)) > maxBytes {
				return exportTruncated(maxItems, maxBytes, page, index)
			}
			if _, err := out.Write(encoded); err != nil {
				return err
			}
			outputBytes += int64(len(encoded))
			emitted++
		}

		if !hasMore {
			return nil
		}
		if len(batch) == 0 {
			return fmt.Errorf("items export page %d was empty while hasMore was true", page)
		}
		if emitted >= maxItems {
			return exportTruncated(maxItems, maxBytes, page+1, 0)
		}
		if page >= maxPaginationPages {
			return fmt.Errorf("pagination aborted after %d pages", maxPaginationPages)
		}
		page++
		pageIndex = 0
	}
}

func recordsFromBatch(batch []any, label string) ([]map[string]any, error) {
	records := make([]map[string]any, 0, len(batch))
	for _, value := range batch {
		record, err := plakydx.RequireRecord(value, label)
		if err != nil {
			return nil, err
		}
		records = append(records, record)
	}
	return records, nil
}

func exportTruncated(maxItems, maxBytes int64, page, index int) error {
	return fmt.Errorf("items export truncated: max-items=%d max-bytes=%d next-page=%d next-index=%d", maxItems, maxBytes, page, index)
}

// maxPaginationPages is a safety valve, not an API contract: it bounds an
// otherwise unbounded paging loop so a server that always reports
// `hasMore: true` cannot spin forever. Kept in lockstep with the SDK's
// MAX_PAGES (sdk/src/runtime/pagination.ts). Not configurable. See
// docs/api-behavior.md.
const maxPaginationPages = 10_000
