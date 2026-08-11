package cli

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestCanonicalJSONPreservesExactNumberLexemes(t *testing.T) {
	for _, value := range []string{
		"9007199254740993",
		"9223372036854775807",
		"-9223372036854775808",
		"1.234567890123456789",
		"1e+100",
	} {
		got, err := canonicalJSON(json.Number(value))
		if err != nil {
			t.Fatalf("canonicalJSON(%q): %v", value, err)
		}
		if got != value {
			t.Fatalf("canonicalJSON(%q) = %q", value, got)
		}
	}
}

func TestCanonicalJSONRejectsMalformedNumberLexemes(t *testing.T) {
	for _, value := range []string{"01", "+1", "1.", ".5", "1e", "NaN"} {
		if _, err := canonicalJSON(json.Number(value)); err == nil {
			t.Fatalf("canonicalJSON(%q) unexpectedly succeeded", value)
		}
	}
}

func TestRenderItemsCSVKeepsNestedExactNumbers(t *testing.T) {
	items := []map[string]any{{
		"id":     json.Number("9223372036854775807"),
		"fields": []any{map[string]any{"key": "amount", "value": []any{json.Number("9007199254740993")}}},
	}}
	output, err := renderItemsCSV(items, "raw")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(output, "9223372036854775807") || !strings.Contains(output, "9007199254740993") {
		t.Fatalf("CSV lost exact numbers: %s", output)
	}
	if bytes.Contains([]byte(output), []byte("9.223372036854776e+18")) {
		t.Fatalf("CSV used float formatting: %s", output)
	}
}
