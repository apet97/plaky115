package plakydx

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"
)

// EmitJSON writes the value as indented JSON to the command's stdout.
func EmitJSON(cmd *cobra.Command, value any) error {
	enc := json.NewEncoder(cmd.OutOrStdout())
	enc.SetIndent("", "  ")
	return enc.Encode(value)
}

// EmitAgent writes a compact, deterministic JSON line for agent consumption.
func EmitAgent(cmd *cobra.Command, value any) error {
	b, err := json.Marshal(value)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintln(cmd.OutOrStdout(), string(b))
	return err
}

// AsRecord narrows any to a JSON-like map.
func AsRecord(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

// CompactItem returns a small id/title view of an item.
func CompactItem(v any) map[string]any {
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

// CompactBoard mirrors CompactItem for boards.
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
