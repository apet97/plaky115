package plakydx

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"
)

func RequireRecord(value any, context string) (map[string]any, error) {
	record, ok := value.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("%s: expected JSON object", context)
	}
	return record, nil
}

func RequirePage(value any, context string) (map[string]any, []any, bool, error) {
	record, err := RequireRecord(value, context)
	if err != nil {
		return nil, nil, false, err
	}
	data, ok := record["data"].([]any)
	if !ok {
		return nil, nil, false, fmt.Errorf("%s: expected data array", context)
	}
	hasMore, ok := record["hasMore"].(bool)
	if !ok {
		return nil, nil, false, fmt.Errorf("%s: expected hasMore boolean", context)
	}
	return record, data, hasMore, nil
}

// EmitJSON writes the value as indented JSON to the command's stdout.
func EmitJSON(cmd *cobra.Command, value any) error {
	enc := json.NewEncoder(cmd.OutOrStdout())
	enc.SetIndent("", "  ")
	return enc.Encode(value)
}

// AsRecord narrows any to a JSON-like map.
func AsRecord(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

// CompactBoard returns a small id/title view of a board.
func CompactBoard(v any) map[string]any {
	m := AsRecord(v)
	out := map[string]any{}
	if id, ok := m["id"]; ok {
		out["id"] = id
	}
	if title, ok := m["title"]; ok {
		out["title"] = title
	}
	return out
}
