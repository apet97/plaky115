package cli

import (
	"fmt"
	"io"
	"regexp"
)

var apiKeyPattern = regexp.MustCompile(`plk_[A-Za-z0-9_-]+`)

func FormatError(err error) string {
	if err == nil {
		return ""
	}
	return apiKeyPattern.ReplaceAllString(err.Error(), "plk_[REDACTED]")
}

func PrintError(w io.Writer, err error) {
	if err == nil {
		return
	}
	fmt.Fprintln(w, FormatError(err))
}
