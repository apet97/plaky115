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
	root.AddCommand(newListTeamsCmd(getClient))
	root.AddCommand(newListUsersCmd(getClient))
	root.AddCommand(newListBoardsCmd(getClient))
	root.AddCommand(newListItemsCmd(getClient))
	root.AddCommand(newCreateItemCmd(getClient))
	root.AddCommand(newGetSpaceCmd(getClient))
	root.AddCommand(newGetTeamCmd(getClient))
	root.AddCommand(newGetCurrentUserCmd(getClient))
	root.AddCommand(newGetBoardCmd(getClient))
	root.AddCommand(newListSubitemsCmd(getClient))
	root.AddCommand(newGetItemCmd(getClient))
	root.AddCommand(newDeleteItemCmd(getClient))
	root.AddCommand(newUpdateItemFieldCmd(getClient))
	root.AddCommand(newUpdateItemFieldsCmd(getClient))
	root.AddCommand(newListItemCommentsCmd(getClient))
	root.AddCommand(newCreateItemCommentCmd(getClient))
	root.AddCommand(newUpdateItemCommentCmd(getClient))
	root.AddCommand(newDeleteItemCommentCmd(getClient))
	root.AddCommand(newReplaceCommentReactionsCmd(getClient))
	return root
}
