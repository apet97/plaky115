package plakydx

import (
	"encoding/json"

	"github.com/spf13/cobra"
)

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
