// Curated CLI commands for item files.
package cli

import (
	"bytes"
	"fmt"
	"github.com/apet97/plaky115-cli/internal/plakydx"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
	"io"
	"os"
	"path/filepath"
)

func newItemFilesListCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "item-files-list",
		Short: "List files attached to an item.",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			spaceID, err := requiredFlagString(cmd, "space-id")
			if err != nil {
				return err
			}
			boardID, err := requiredFlagString(cmd, "board-id")
			if err != nil {
				return err
			}
			itemID, err := requiredFlagString(cmd, "item-id")
			if err != nil {
				return err
			}
			if err := validateIDValues(
				struct{ name, value string }{"space-id", spaceID},
				struct{ name, value string }{"board-id", boardID},
				struct{ name, value string }{"item-id", itemID},
			); err != nil {
				return err
			}
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			out, err := c.ListItemFiles(cmd.Context(), plakysdk.ListItemFilesOptions{SpaceId: spaceID, BoardId: boardID, ItemId: itemID})
			if err != nil {
				return err
			}
			return plakydx.EmitJSON(cmd, out)
		},
	}
	addItemFileIDFlags(cmd, false)
	return cmd
}

func newItemFilesUploadCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "item-files-upload",
		Short: "Upload one file to an item.",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			spaceID, err := requiredFlagString(cmd, "space-id")
			if err != nil {
				return err
			}
			boardID, err := requiredFlagString(cmd, "board-id")
			if err != nil {
				return err
			}
			itemID, err := requiredFlagString(cmd, "item-id")
			if err != nil {
				return err
			}
			if err := validateIDValues(
				struct{ name, value string }{"space-id", spaceID},
				struct{ name, value string }{"board-id", boardID},
				struct{ name, value string }{"item-id", itemID},
			); err != nil {
				return err
			}
			idempotencyKey, _ := cmd.Flags().GetString("idempotency-key")
			upload, err := curatedUpload(cmd)
			if err != nil {
				return err
			}
			defer upload.close()
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			out, err := c.UploadItemFile(cmd.Context(), plakysdk.UploadItemFileOptions{
				SpaceId: spaceID, BoardId: boardID, ItemId: itemID,
				Multipart:      &plakysdk.MultipartFileBody{Reader: upload.reader, FileName: upload.fileName, ContentType: upload.contentType},
				IdempotencyKey: idempotencyKey,
			})
			if err != nil {
				return err
			}
			return plakydx.EmitJSON(cmd, out)
		},
	}
	addItemFileIDFlags(cmd, false)
	cmd.Flags().String("file", "", "File to upload; use - for stdin (required)")
	cmd.Flags().String("filename", "", "Filename; required with --file - and otherwise defaults to the path basename")
	cmd.Flags().String("content-type", "", "Optional file media type")
	cmd.Flags().String("idempotency-key", "", "Optional Idempotency-Key header")
	markStdinConsumer(cmd, "file")
	markRequired(cmd, "file")
	return cmd
}

func newItemFilesDownloadLinkCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "item-files-download-link",
		Short: "Return signed download-link metadata without downloading bytes.",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			spaceID, err := requiredFlagString(cmd, "space-id")
			if err != nil {
				return err
			}
			boardID, err := requiredFlagString(cmd, "board-id")
			if err != nil {
				return err
			}
			itemID, err := requiredFlagString(cmd, "item-id")
			if err != nil {
				return err
			}
			itemFileID, err := requiredFlagString(cmd, "item-file-id")
			if err != nil {
				return err
			}
			if err := validateIDValues(
				struct{ name, value string }{"space-id", spaceID},
				struct{ name, value string }{"board-id", boardID},
				struct{ name, value string }{"item-id", itemID},
				struct{ name, value string }{"item-file-id", itemFileID},
			); err != nil {
				return err
			}
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			out, err := c.GetItemFileDownload(cmd.Context(), plakysdk.GetItemFileDownloadOptions{
				SpaceId: spaceID, BoardId: boardID, ItemId: itemID, ItemFileId: itemFileID,
			})
			if err != nil {
				return err
			}
			return plakydx.EmitJSON(cmd, out)
		},
	}
	addItemFileIDFlags(cmd, true)
	return cmd
}

func addItemFileIDFlags(cmd *cobra.Command, includeFileID bool) {
	cmd.Flags().String("space-id", "", "Space ID (required)")
	cmd.Flags().String("board-id", "", "Board ID (required)")
	cmd.Flags().String("item-id", "", "Item ID (required)")
	required := []string{"space-id", "board-id", "item-id"}
	if includeFileID {
		cmd.Flags().String("item-file-id", "", "Item file ID (required)")
		required = append(required, "item-file-id")
	}
	markRequired(cmd, required...)
}

type curatedUploadInput struct {
	reader      io.Reader
	fileName    string
	contentType string
	close       func() error
}

func curatedUpload(cmd *cobra.Command) (*curatedUploadInput, error) {
	source, _ := cmd.Flags().GetString("file")
	fileName, _ := cmd.Flags().GetString("filename")
	contentType, _ := cmd.Flags().GetString("content-type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	if source == "-" {
		if fileName == "" {
			return nil, fmt.Errorf("--filename is required with --file -")
		}
		validatedType, err := plakydx.ValidateUploadMetadata(fileName, contentType)
		if err != nil {
			return nil, err
		}
		data, err := io.ReadAll(io.LimitReader(cmd.InOrStdin(), plakydx.MaxUploadBytes+1))
		if err != nil {
			return nil, fmt.Errorf("read --file -: %w", err)
		}
		if int64(len(data)) > plakydx.MaxUploadBytes {
			return nil, fmt.Errorf("upload exceeds the %d-byte limit", plakydx.MaxUploadBytes)
		}
		return &curatedUploadInput{reader: bytes.NewReader(data), fileName: fileName, contentType: validatedType, close: func() error { return nil }}, nil
	}
	info, err := os.Stat(source)
	if err != nil {
		return nil, fmt.Errorf("stat --file: %w", err)
	}
	if info.Size() > plakydx.MaxUploadBytes {
		return nil, fmt.Errorf("upload exceeds the %d-byte limit", plakydx.MaxUploadBytes)
	}
	if !info.Mode().IsRegular() {
		return nil, fmt.Errorf("--file must name a regular file")
	}
	file, err := os.Open(source)
	if err != nil {
		return nil, fmt.Errorf("open --file: %w", err)
	}
	if fileName == "" {
		fileName = filepath.Base(source)
	}
	validatedType, err := plakydx.ValidateUploadMetadata(fileName, contentType)
	if err != nil {
		_ = file.Close()
		return nil, err
	}
	return &curatedUploadInput{reader: file, fileName: fileName, contentType: validatedType, close: file.Close}, nil
}
