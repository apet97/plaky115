// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

type ClientFactory func(*cobra.Command) (*plakysdk.Client, error)

func NewRawRoot(getClient ClientFactory) *cobra.Command {
	root := &cobra.Command{Use: "raw", Short: "Direct Plaky API operations (one command per OpenAPI operation)."}
	root.AddCommand(newListSpacesCmd(getClient))
	root.AddCommand(newGetSpaceCmd(getClient))
	root.AddCommand(newListBoardsCmd(getClient))
	root.AddCommand(newGetBoardCmd(getClient))
	root.AddCommand(newListItemGroupsCmd(getClient))
	root.AddCommand(newCreateItemGroupCmd(getClient))
	root.AddCommand(newDeleteItemGroupCmd(getClient))
	root.AddCommand(newGetItemGroupCmd(getClient))
	root.AddCommand(newUpdateItemGroupCmd(getClient))
	root.AddCommand(newArchiveItemGroupCmd(getClient))
	root.AddCommand(newListItemsCmd(getClient))
	root.AddCommand(newCreateItemCmd(getClient))
	root.AddCommand(newDeleteItemCmd(getClient))
	root.AddCommand(newGetItemCmd(getClient))
	root.AddCommand(newListItemCommentsCmd(getClient))
	root.AddCommand(newCreateItemCommentCmd(getClient))
	root.AddCommand(newDeleteItemCommentCmd(getClient))
	root.AddCommand(newUpdateItemCommentCmd(getClient))
	root.AddCommand(newReplaceCommentReactionsCmd(getClient))
	root.AddCommand(newUpdateItemFieldsCmd(getClient))
	root.AddCommand(newUpdateItemFieldCmd(getClient))
	root.AddCommand(newListItemFilesCmd(getClient))
	root.AddCommand(newUploadItemFileCmd(getClient))
	root.AddCommand(newDeleteItemFileCmd(getClient))
	root.AddCommand(newGetItemFileCmd(getClient))
	root.AddCommand(newUpdateItemFileCmd(getClient))
	root.AddCommand(newGetItemFileDownloadCmd(getClient))
	root.AddCommand(newListSubitemsCmd(getClient))
	root.AddCommand(newListTeamsCmd(getClient))
	root.AddCommand(newGetTeamCmd(getClient))
	root.AddCommand(newListUsersCmd(getClient))
	root.AddCommand(newGetCurrentUserCmd(getClient))
	return root
}
