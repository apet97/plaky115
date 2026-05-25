// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json
package raw

import (
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func NewRawRoot(client *plakysdk.Client) *cobra.Command {
	root := &cobra.Command{Use: "raw", Short: "Direct Plaky API operations (one command per OpenAPI operation)."}
	root.AddCommand(newListSpacesCmd(client))
	root.AddCommand(newListTeamsCmd(client))
	root.AddCommand(newListUsersCmd(client))
	root.AddCommand(newListBoardsCmd(client))
	root.AddCommand(newListItemsCmd(client))
	root.AddCommand(newCreateItemCmd(client))
	root.AddCommand(newGetSpaceCmd(client))
	root.AddCommand(newGetTeamCmd(client))
	root.AddCommand(newGetCurrentUserCmd(client))
	root.AddCommand(newGetBoardCmd(client))
	root.AddCommand(newListSubitemsCmd(client))
	root.AddCommand(newGetItemCmd(client))
	root.AddCommand(newDeleteItemCmd(client))
	root.AddCommand(newUpdateItemFieldCmd(client))
	root.AddCommand(newUpdateItemFieldsCmd(client))
	root.AddCommand(newListItemCommentsCmd(client))
	root.AddCommand(newCreateItemCommentCmd(client))
	root.AddCommand(newUpdateItemCommentCmd(client))
	root.AddCommand(newDeleteItemCommentCmd(client))
	root.AddCommand(newReplaceCommentReactionsCmd(client))
	return root
}
