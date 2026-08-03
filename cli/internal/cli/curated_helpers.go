// Curated CLI commands for curated helpers.
package cli

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

// markRequired marks the named flags required via Cobra's own mechanism, so
// missing flags are reported uniformly (and before any handler/client work).
// A failure means the flag was never defined (a programmer error), so we panic
// to surface it immediately in tests rather than silently no-op.
func markRequired(cmd *cobra.Command, names ...string) {
	for _, name := range names {
		if err := cmd.MarkFlagRequired(name); err != nil {
			panic(fmt.Sprintf("markRequired %q: %v", name, err))
		}
	}
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
		return canonicalInt64(t)
	case json.Number:
		return canonicalInt64(t.String())
	case float64:
		if math.IsNaN(t) || math.IsInf(t, 0) || math.Trunc(t) != t || math.Abs(t) > 1<<53-1 {
			return "", fmt.Errorf("invalid numeric id %v", t)
		}
		return strconv.FormatInt(int64(t), 10), nil
	case int:
		if t < 0 {
			return "", fmt.Errorf("invalid numeric id %v", t)
		}
		return strconv.FormatInt(int64(t), 10), nil
	case int64:
		if t < 0 {
			return "", fmt.Errorf("invalid numeric id %v", t)
		}
		return strconv.FormatInt(t, 10), nil
	default:
		return "", fmt.Errorf("unexpected id type %T", v)
	}
}

func canonicalInt64(value string) (string, error) {
	return plakysdk.CanonicalInt64ID(value)
}

func drainPaged(pageSize int, fetch func(page int, pageSize int) (any, error)) ([]map[string]any, error) {
	all := []map[string]any{}
	for page := 1; ; page++ {
		raw, err := fetch(page, pageSize)
		if err != nil {
			return nil, err
		}
		_, batch, hasMore, err := plakydx.RequirePage(raw, "paginated response")
		if err != nil {
			return nil, err
		}
		for _, item := range batch {
			record, err := plakydx.RequireRecord(item, "paginated item")
			if err != nil {
				return nil, err
			}
			all = append(all, record)
		}
		if !hasMore {
			return all, nil
		}
		if len(batch) == 0 {
			return nil, fmt.Errorf("pagination page %d was empty while hasMore was true", page)
		}
		if page >= maxPaginationPages {
			return nil, fmt.Errorf("pagination aborted after %d pages", maxPaginationPages)
		}
	}
}

func filterByTitle(raw any, needle, key string) ([]map[string]any, error) {
	var data []map[string]any
	switch typed := raw.(type) {
	case []map[string]any:
		data = typed
	default:
		_, batch, _, err := plakydx.RequirePage(raw, "find response")
		if err != nil {
			return nil, err
		}
		for _, item := range batch {
			record, err := plakydx.RequireRecord(item, "find item")
			if err != nil {
				return nil, err
			}
			data = append(data, record)
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
	return hits, nil
}
