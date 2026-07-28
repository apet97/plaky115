package cli

import (
	"encoding/json"
	"testing"
)

func TestMustIDPreservesExactJSONIntegers(t *testing.T) {
	for _, test := range []struct {
		value any
		want  string
	}{
		{json.Number("9007199254740992"), "9007199254740992"},
		{json.Number("9223372036854775807"), "9223372036854775807"},
		{int64(-9223372036854775808), "-9223372036854775808"},
	} {
		got, err := mustID(test.value)
		if err != nil || got != test.want {
			t.Fatalf("mustID(%v) = %q, %v", test.value, got, err)
		}
	}
	for _, value := range []any{9007199254740992.0, 1.5, json.Number("01"), "9223372036854775808"} {
		if _, err := mustID(value); err == nil {
			t.Fatalf("mustID(%v) succeeded", value)
		}
	}
}
