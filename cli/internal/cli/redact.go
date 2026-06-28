package cli

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"

	"github.com/apet97/plaky115-cli/internal/plakysdk"
)

var apiKeyPattern = regexp.MustCompile(`plk_[A-Za-z0-9_-]+`)

func FormatError(err error) string {
	if err == nil {
		return ""
	}
	return apiKeyPattern.ReplaceAllString(err.Error(), "plk_[REDACTED]")
}

// PrintError writes a redacted error to w. When asJSON is true it emits a
// structured envelope ({"error":{...}}); otherwise it emits one line of
// redacted text. Success output is already JSON, so the envelope lets scripts
// parse failures from the same toolchain.
func PrintError(w io.Writer, err error, asJSON bool) {
	if err == nil {
		return
	}
	if asJSON {
		printErrorJSON(w, err)
		return
	}
	fmt.Fprintln(w, FormatError(err))
}

func printErrorJSON(w io.Writer, err error) {
	envelope := map[string]any{"message": FormatError(err)}
	var apiErr *plakysdk.APIError
	if errors.As(err, &apiErr) {
		envelope["status"] = apiErr.Status
		if apiErr.RequestID != "" {
			envelope["requestId"] = apiErr.RequestID
		}
	}
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	if encErr := enc.Encode(map[string]any{"error": envelope}); encErr != nil {
		// Fall back to text so a marshalling failure never swallows the error.
		fmt.Fprintln(w, FormatError(err))
	}
}
