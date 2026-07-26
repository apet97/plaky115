package plakydx

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

type openedUpload struct {
	Reader      io.Reader
	FileName    string
	ContentType string
	close       func() error
}

func (upload *openedUpload) Close() error {
	if upload.close == nil {
		return nil
	}
	return upload.close()
}

func requiredStringFlag(cmd *cobra.Command, name string) (string, error) {
	value, err := cmd.Flags().GetString(name)
	if err != nil {
		return "", err
	}
	if value == "" {
		return "", fmt.Errorf("--%s is required", name)
	}
	return value, nil
}

func optionalStringFlag(cmd *cobra.Command, name string) (string, error) {
	return cmd.Flags().GetString(name)
}

func optionalStringArrayFlag(cmd *cobra.Command, name string) ([]string, error) {
	return cmd.Flags().GetStringArray(name)
}

func optionalIntFlag(cmd *cobra.Command, name string) (int, error) {
	return cmd.Flags().GetInt(name)
}

func optionalInt64Flag(cmd *cobra.Command, name string) (int64, error) {
	return cmd.Flags().GetInt64(name)
}

func optionalFloat64Flag(cmd *cobra.Command, name string) (*float64, error) {
	if !cmd.Flags().Changed(name) {
		return nil, nil
	}
	value, err := cmd.Flags().GetFloat64(name)
	return &value, err
}

func optionalBoolFlag(cmd *cobra.Command, name string) (*bool, error) {
	if !cmd.Flags().Changed(name) {
		return nil, nil
	}
	value, err := cmd.Flags().GetBool(name)
	return &value, err
}

func jsonBodyFlag(cmd *cobra.Command, required bool) (any, error) {
	raw, err := optionalStringFlag(cmd, "body")
	if err != nil {
		return nil, err
	}
	if raw == "" {
		if required {
			return nil, fmt.Errorf("--body is required")
		}
		return nil, nil
	}
	return ParseBody(cmd, raw)
}

// ParseBody resolves a raw --body value into JSON: "@-" reads stdin, "@file"
// reads a file, and anything else is parsed as inline JSON.
func ParseBody(cmd *cobra.Command, raw string) (any, error) {
	if raw == "@-" {
		body, err := io.ReadAll(cmd.InOrStdin())
		if err != nil {
			return nil, fmt.Errorf("read --body @-: %w", err)
		}
		raw = string(body)
	} else if file, ok := strings.CutPrefix(raw, "@"); ok {
		body, err := os.ReadFile(file)
		if err != nil {
			return nil, fmt.Errorf("read --body file: %w", err)
		}
		raw = string(body)
	}

	decoder := json.NewDecoder(strings.NewReader(raw))
	decoder.UseNumber()
	var value any
	if err := decoder.Decode(&value); err != nil {
		return nil, fmt.Errorf("invalid --body JSON: %w", err)
	}
	if err := ensureJSONEnd(decoder); err != nil {
		return nil, err
	}
	return value, nil
}

func ensureJSONEnd(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		if err == nil {
			return fmt.Errorf("invalid --body JSON: multiple values")
		}
		return fmt.Errorf("invalid --body JSON: %w", err)
	}
	return nil
}

func openUploadFlag(cmd *cobra.Command) (*openedUpload, error) {
	source, err := requiredStringFlag(cmd, "file")
	if err != nil {
		return nil, err
	}
	fileName, err := optionalStringFlag(cmd, "filename")
	if err != nil {
		return nil, err
	}
	contentType, err := optionalStringFlag(cmd, "content-type")
	if err != nil {
		return nil, err
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	if source == "-" {
		if fileName == "" {
			return nil, fmt.Errorf("--filename is required with --file -")
		}
		return &openedUpload{
			Reader:      cmd.InOrStdin(),
			FileName:    fileName,
			ContentType: contentType,
		}, nil
	}

	file, err := os.Open(source)
	if err != nil {
		return nil, fmt.Errorf("open --file: %w", err)
	}
	if fileName == "" {
		fileName = filepath.Base(source)
	}
	return &openedUpload{
		Reader:      file,
		FileName:    fileName,
		ContentType: contentType,
		close:       file.Close,
	}, nil
}

func confirmationFlag(cmd *cobra.Command) error {
	confirmed, err := cmd.Flags().GetBool("confirm")
	if err != nil {
		return err
	}
	if !confirmed {
		return fmt.Errorf("--confirm is required for this destructive raw operation")
	}
	return nil
}

func emitVoid(cmd *cobra.Command) error {
	jsonMode, err := cmd.Flags().GetBool("json")
	if err == nil && jsonMode {
		return EmitJSON(cmd, map[string]any{"ok": true})
	}
	_, err = fmt.Fprintln(cmd.OutOrStdout(), "ok")
	return err
}
