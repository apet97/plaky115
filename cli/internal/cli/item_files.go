// Curated CLI commands for item files.
package cli

import (
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
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			spaceID, _ := cmd.Flags().GetString("space-id")
			boardID, _ := cmd.Flags().GetString("board-id")
			itemID, _ := cmd.Flags().GetString("item-id")
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
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			spaceID, _ := cmd.Flags().GetString("space-id")
			boardID, _ := cmd.Flags().GetString("board-id")
			itemID, _ := cmd.Flags().GetString("item-id")
			idempotencyKey, _ := cmd.Flags().GetString("idempotency-key")
			upload, err := curatedUpload(cmd)
			if err != nil {
				return err
			}
			defer upload.close()
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
	markRequired(cmd, "file")
	return cmd
}

func newItemFilesDownloadLinkCommand(getClient clientFactory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "item-files-download-link",
		Short: "Return signed download-link metadata without downloading bytes.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			spaceID, _ := cmd.Flags().GetString("space-id")
			boardID, _ := cmd.Flags().GetString("board-id")
			itemID, _ := cmd.Flags().GetString("item-id")
			itemFileID, _ := cmd.Flags().GetString("item-file-id")
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
		return &curatedUploadInput{reader: cmd.InOrStdin(), fileName: fileName, contentType: contentType, close: func() error { return nil }}, nil
	}
	file, err := os.Open(source)
	if err != nil {
		return nil, fmt.Errorf("open --file: %w", err)
	}
	if fileName == "" {
		fileName = filepath.Base(source)
	}
	return &curatedUploadInput{reader: file, fileName: fileName, contentType: contentType, close: file.Close}, nil
}
