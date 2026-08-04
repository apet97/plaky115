package plakydx

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

type openedUpload struct {
	Reader      io.Reader
	FileName    string
	ContentType string
	close       func() error
}

const (
	MaxUploadBytes         int64 = 25 * 1024 * 1024
	MaxUploadFilenameBytes       = 255
	MaxJSONBytes                 = 16 * 1024 * 1024
	MaxJSONDepth                 = 128
)

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

func requiredInt64IDFlag(cmd *cobra.Command, name string) (string, error) {
	value, err := requiredStringFlag(cmd, name)
	if err != nil {
		return "", err
	}
	if _, err := plakysdk.CanonicalInt64ID(value); err != nil {
		return "", fmt.Errorf("--%s: %w", name, err)
	}
	return value, nil
}

func optionalStringFlag(cmd *cobra.Command, name string) (string, error) {
	return cmd.Flags().GetString(name)
}

func optionalStringArrayFlag(cmd *cobra.Command, name string) ([]string, error) {
	return cmd.Flags().GetStringArray(name)
}

func optionalIntFlag(cmd *cobra.Command, name string, bounds ...int) (int, error) {
	if len(bounds) > 2 {
		return 0, fmt.Errorf("--%s has invalid bounds", name)
	}
	value, err := cmd.Flags().GetInt(name)
	if err != nil {
		return 0, err
	}
	if len(bounds) >= 1 && (cmd.Flags().Changed(name) || value != 0) && value < bounds[0] {
		return 0, fmt.Errorf("--%s must be at least %d", name, bounds[0])
	}
	if len(bounds) == 2 && value > bounds[1] {
		return 0, fmt.Errorf("--%s must be at most %d", name, bounds[1])
	}
	return value, nil
}

func optionalInt64Flag(cmd *cobra.Command, name string) (int64, error) {
	value, err := cmd.Flags().GetInt64(name)
	if err == nil && value < 0 {
		return 0, fmt.Errorf("--%s must be non-negative", name)
	}
	return value, err
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

func jsonBodyFlag(cmd *cobra.Command, required bool, requiredProperties ...string) (any, error) {
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
	return ParseJSONBody(cmd, raw, required, requiredProperties...)
}

// ParseBody resolves a raw --body value into JSON: "@-" reads stdin, "@file"
// reads a file, and anything else is parsed as inline JSON.
func ParseBody(cmd *cobra.Command, raw string) (any, error) {
	var (
		body   []byte
		source = "--body"
	)
	if raw == "@-" {
		var err error
		body, err = readBoundedJSON(cmd.InOrStdin(), MaxJSONBytes, "read --body @-")
		if err != nil {
			return nil, err
		}
		source = "--body @-"
	} else if file, ok := strings.CutPrefix(raw, "@"); ok {
		handle, err := os.Open(file)
		if err != nil {
			return nil, fmt.Errorf("read --body file: %w", err)
		}
		defer handle.Close()
		body, err = readBoundedJSON(handle, MaxJSONBytes, "read --body file")
		if err != nil {
			return nil, err
		}
		source = "--body @" + file
	} else {
		if len([]byte(raw)) > MaxJSONBytes {
			return nil, fmt.Errorf("--body exceeds the %d-byte limit", MaxJSONBytes)
		}
		body = []byte(raw)
	}
	return decodeStrictJSON(body, source)
}

func ParseJSONBody(cmd *cobra.Command, raw string, required bool, requiredProperties ...string) (any, error) {
	value, err := ParseBody(cmd, raw)
	if err != nil {
		return nil, err
	}
	if value == nil && required {
		return nil, fmt.Errorf("JSON body must be a JSON object")
	}
	if err := plakysdk.ValidateJSONBody(value, required, requiredProperties...); err != nil {
		return nil, err
	}
	return value, nil
}

func readBoundedJSON(input io.Reader, max int, source string) ([]byte, error) {
	body, err := io.ReadAll(io.LimitReader(input, int64(max)+1))
	if err != nil {
		return nil, fmt.Errorf("%s: %w", source, err)
	}
	if len(body) > max {
		return nil, fmt.Errorf("%s exceeds the %d-byte limit", source, max)
	}
	return body, nil
}

func decodeStrictJSON(body []byte, source string) (any, error) {
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()
	value, err := decodeJSONValue(decoder, "$", 0, source)
	if err != nil {
		return nil, err
	}
	if _, err := decoder.Token(); err != io.EOF {
		if err == nil {
			return nil, strictJSONError(source, "$", "multiple JSON values")
		}
		return nil, strictJSONError(source, "$", err)
	}
	return value, nil
}

func decodeJSONValue(decoder *json.Decoder, pointer string, depth int, source string) (any, error) {
	token, err := decoder.Token()
	if err != nil {
		return nil, strictJSONError(source, pointer, err)
	}
	delim, isDelim := token.(json.Delim)
	if !isDelim {
		return token, nil
	}
	if depth >= MaxJSONDepth {
		return nil, strictJSONError(source, pointer, fmt.Sprintf("maximum nesting depth %d exceeded", MaxJSONDepth))
	}

	switch delim {
	case '{':
		object := make(map[string]any)
		for decoder.More() {
			keyToken, err := decoder.Token()
			if err != nil {
				return nil, strictJSONError(source, pointer, err)
			}
			key, ok := keyToken.(string)
			if !ok {
				return nil, strictJSONError(source, pointer, "object key must be a string")
			}
			childPointer := joinJSONPointer(pointer, key)
			if _, exists := object[key]; exists {
				return nil, strictJSONError(source, childPointer, "duplicate object key")
			}
			value, err := decodeJSONValue(decoder, childPointer, depth+1, source)
			if err != nil {
				return nil, err
			}
			object[key] = value
		}
		if err := consumeJSONDelimiter(decoder, '}', source, pointer); err != nil {
			return nil, err
		}
		return object, nil
	case '[':
		array := make([]any, 0)
		for decoder.More() {
			childPointer := joinJSONPointer(pointer, strconv.Itoa(len(array)))
			value, err := decodeJSONValue(decoder, childPointer, depth+1, source)
			if err != nil {
				return nil, err
			}
			array = append(array, value)
		}
		if err := consumeJSONDelimiter(decoder, ']', source, pointer); err != nil {
			return nil, err
		}
		return array, nil
	default:
		return nil, strictJSONError(source, pointer, "unexpected delimiter")
	}
}

func consumeJSONDelimiter(decoder *json.Decoder, want json.Delim, source, pointer string) error {
	token, err := decoder.Token()
	if err != nil {
		return strictJSONError(source, pointer, err)
	}
	if token != want {
		return strictJSONError(source, pointer, fmt.Sprintf("expected %q", want))
	}
	return nil
}

func joinJSONPointer(pointer, token string) string {
	token = strings.ReplaceAll(token, "~", "~0")
	token = strings.ReplaceAll(token, "/", "~1")
	return pointer + "/" + token
}

func strictJSONError(source, pointer string, detail any) error {
	return fmt.Errorf("invalid --body JSON in %s at %s: %v", source, pointer, detail)
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
		contentType, err = ValidateUploadMetadata(fileName, contentType)
		if err != nil {
			return nil, err
		}
		data, err := io.ReadAll(io.LimitReader(cmd.InOrStdin(), MaxUploadBytes+1))
		if err != nil {
			return nil, fmt.Errorf("read --file -: %w", err)
		}
		if int64(len(data)) > MaxUploadBytes {
			return nil, fmt.Errorf("upload exceeds the %d-byte limit", MaxUploadBytes)
		}
		return &openedUpload{Reader: bytes.NewReader(data), FileName: fileName, ContentType: contentType}, nil
	}

	info, err := os.Stat(source)
	if err != nil {
		return nil, fmt.Errorf("open --file: %w", err)
	}
	if info.Size() > MaxUploadBytes {
		return nil, fmt.Errorf("upload exceeds the %d-byte limit", MaxUploadBytes)
	}
	if !info.Mode().IsRegular() {
		return nil, fmt.Errorf("--file must name a regular file")
	}
	if fileName == "" {
		fileName = filepath.Base(source)
	}
	contentType, err = ValidateUploadMetadata(fileName, contentType)
	if err != nil {
		return nil, err
	}
	file, err := os.Open(source)
	if err != nil {
		return nil, fmt.Errorf("open --file: %w", err)
	}
	return &openedUpload{
		Reader:      file,
		FileName:    fileName,
		ContentType: contentType,
		close:       file.Close,
	}, nil
}

// ValidateUploadMetadata applies the same local filename/media-type policy to
// raw and curated CLI uploads before a request body is constructed.
func ValidateUploadMetadata(fileName, contentType string) (string, error) {
	if fileName == "" {
		return "", fmt.Errorf("upload filename must be non-empty")
	}
	if strings.ContainsAny(fileName, `/\\`) || !utf8.ValidString(fileName) || len([]byte(fileName)) > MaxUploadFilenameBytes {
		return "", fmt.Errorf("upload filename must be a safe UTF-8 name of at most %d bytes", MaxUploadFilenameBytes)
	}
	for _, r := range fileName {
		if r < 0x20 || (r >= 0x7f && r <= 0x9f) {
			return "", fmt.Errorf("upload filename must not contain control characters")
		}
	}
	for _, r := range contentType {
		if r < 0x20 || (r >= 0x7f && r <= 0x9f) {
			return "", fmt.Errorf("upload content type must not contain control characters")
		}
	}
	mediaType, params, err := mime.ParseMediaType(contentType)
	if err != nil || mediaType == "" {
		return "", fmt.Errorf("upload content type must be a valid media type")
	}
	return mime.FormatMediaType(mediaType, params), nil
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
