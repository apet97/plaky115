package cli

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestMustIDPreservesExactJSONIntegers(t *testing.T) {
	for _, test := range []struct {
		value any
		want  string
	}{
		{json.Number("9007199254740992"), "9007199254740992"},
		{json.Number("9223372036854775807"), "9223372036854775807"},
	} {
		got, err := mustID(test.value)
		if err != nil || got != test.want {
			t.Fatalf("mustID(%v) = %q, %v", test.value, got, err)
		}
	}
	for _, value := range []any{9007199254740992.0, 1.5, json.Number("01"), "9223372036854775808", json.Number("-9223372036854775808"), int64(-1)} {
		if _, err := mustID(value); err == nil {
			t.Fatalf("mustID(%v) succeeded", value)
		}
	}
}

func TestDrainPagedRejectsEmptyPageWithHasMore(t *testing.T) {
	calls := 0
	_, err := drainPaged(200, func(page, pageSize int) (any, error) {
		calls++
		if pageSize != 200 {
			t.Fatalf("page size = %d, want 200", pageSize)
		}
		return map[string]any{"data": []any{}, "hasMore": true}, nil
	})
	if err == nil || !strings.Contains(err.Error(), "empty while hasMore was true") {
		t.Fatalf("drainPaged error = %v", err)
	}
	if calls != 1 {
		t.Fatalf("drainPaged made %d calls, want 1", calls)
	}
}
