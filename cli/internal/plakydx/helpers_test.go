package plakydx

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/spf13/cobra"
)

func TestJSONBodyFlagParsesInlineAndRequiresConfiguredBody(t *testing.T) {
	cmd := helperCommand()
	if _, err := jsonBodyFlag(cmd, true); err == nil || !strings.Contains(err.Error(), "--body is required") {
		t.Fatalf("missing body error = %v", err)
	}
	if err := cmd.Flags().Set("body", `{"count":9007199254740993}`); err != nil {
		t.Fatal(err)
	}
	value, err := jsonBodyFlag(cmd, true)
	if err != nil {
		t.Fatal(err)
	}
	record := value.(map[string]any)
	if record["count"].(json.Number).String() != "9007199254740993" {
		t.Fatalf("count = %#v", record["count"])
	}
}

func TestRequiredJSONBodyRejectsNonObjectRoots(t *testing.T) {
	for _, raw := range []string{"null", "[]", `"value"`, "1", "true"} {
		cmd := helperCommand()
		if err := cmd.Flags().Set("body", raw); err != nil {
			t.Fatal(err)
		}
		if _, err := jsonBodyFlag(cmd, true); err == nil || !strings.Contains(err.Error(), "JSON object") {
			t.Fatalf("body %s error = %v", raw, err)
		}
	}
}

func TestOpenUploadFlagStreamsFileAndDefaultsFilename(t *testing.T) {
	path := filepath.Join(t.TempDir(), "fixture.bin")
	if err := os.WriteFile(path, []byte("fixture"), 0o600); err != nil {
		t.Fatal(err)
	}
	cmd := helperCommand()
	if err := cmd.Flags().Set("file", path); err != nil {
		t.Fatal(err)
	}
	upload, err := openUploadFlag(cmd)
	if err != nil {
		t.Fatal(err)
	}
	if upload.FileName != "fixture.bin" || upload.ContentType != "application/octet-stream" {
		t.Fatalf("upload metadata = %#v", upload)
	}
	got, err := io.ReadAll(upload.Reader)
	if err != nil || string(got) != "fixture" {
		t.Fatalf("read = %q, %v", got, err)
	}
	if err := upload.Close(); err != nil {
		t.Fatal(err)
	}
	if _, err := upload.Reader.Read(make([]byte, 1)); err == nil {
		t.Fatal("regular upload file remained open")
	}
}

func TestOpenUploadFlagRequiresStdinFilenameAndDoesNotCloseStdin(t *testing.T) {
	cmd := helperCommand()
	stdin := &trackingReader{Reader: *strings.NewReader("stream")}
	cmd.SetIn(stdin)
	if err := cmd.Flags().Set("file", "-"); err != nil {
		t.Fatal(err)
	}
	if _, err := openUploadFlag(cmd); err == nil || !strings.Contains(err.Error(), "--filename") {
		t.Fatalf("stdin filename error = %v", err)
	}
	if err := cmd.Flags().Set("filename", "stdin.txt"); err != nil {
		t.Fatal(err)
	}
	upload, err := openUploadFlag(cmd)
	if err != nil {
		t.Fatal(err)
	}
	if err := upload.Close(); err != nil {
		t.Fatal(err)
	}
	if stdin.closed {
		t.Fatal("stdin was closed")
	}
}

func TestConfirmationAndVoidOutput(t *testing.T) {
	cmd := helperCommand()
	var output bytes.Buffer
	cmd.SetOut(&output)
	if err := confirmationFlag(cmd); err == nil {
		t.Fatal("missing confirmation succeeded")
	}
	if err := cmd.Flags().Set("confirm", "true"); err != nil {
		t.Fatal(err)
	}
	if err := confirmationFlag(cmd); err != nil {
		t.Fatal(err)
	}
	if err := emitVoid(cmd); err != nil {
		t.Fatal(err)
	}
	if output.String() != "ok\n" {
		t.Fatalf("text receipt = %q", output.String())
	}
	output.Reset()
	if err := cmd.Flags().Set("json", "true"); err != nil {
		t.Fatal(err)
	}
	if err := emitVoid(cmd); err != nil {
		t.Fatal(err)
	}
	if output.String() != "{\n  \"ok\": true\n}\n" {
		t.Fatalf("json receipt = %q", output.String())
	}
}

type trackingReader struct {
	strings.Reader
	closed bool
}

func (reader *trackingReader) Close() error {
	reader.closed = true
	return nil
}

func helperCommand() *cobra.Command {
	cmd := &cobra.Command{Use: "fixture"}
	cmd.Flags().String("body", "", "")
	cmd.Flags().String("file", "", "")
	cmd.Flags().String("filename", "", "")
	cmd.Flags().String("content-type", "", "")
	cmd.Flags().Bool("confirm", false, "")
	cmd.Flags().Bool("json", false, "")
	return cmd
}
