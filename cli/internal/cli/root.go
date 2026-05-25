// Package cli wires the plaky115 CLI root and curated commands.
package cli

import (
	"fmt"
	"os"

	"github.com/apet97/plaky115-cli/internal/cli/raw"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

func NewRootCommand() (*cobra.Command, error) {
	root := &cobra.Command{
		Use:           "plaky115",
		Short:         "Unofficial Plaky115 CLI (hand-crafted toolkit).",
		Long:          "Plaky115 CLI: hand-crafted Plaky API client with raw operations under `plaky115 raw <op>` and curated workflows at top level.",
		SilenceUsage:  true,
		SilenceErrors: true,
	}

	root.PersistentFlags().String("server-url", "", "Override Plaky API base URL (default: https://api.plaky.com)")
	root.PersistentFlags().String("api-key", "", "Plaky API key (or set PLAKY115_API_KEY / PLAKY115_API_KEY_AUTH)")

	client, err := buildClient(root)
	if err != nil {
		return nil, err
	}

	root.AddCommand(raw.NewRawRoot(client))
	root.AddCommand(newDoctorCommand(client))
	root.AddCommand(newWorkspaceMapCommand(client))
	root.AddCommand(newFindCommand(client))
	root.AddCommand(newFieldsListCommand(client))
	root.AddCommand(newItemsCreateSimpleCommand(client))
	root.AddCommand(newItemsBulkUpdateCommand(client))
	root.AddCommand(newItemsExportCommand(client))
	root.AddCommand(newCommentsAddCommand(client))
	root.AddCommand(newCompletionCommand(root))

	return root, nil
}

func buildClient(root *cobra.Command) (*plakysdk.Client, error) {
	apiKey, _ := root.PersistentFlags().GetString("api-key")
	if apiKey == "" {
		apiKey = os.Getenv("PLAKY115_API_KEY")
	}
	if apiKey == "" {
		apiKey = os.Getenv("PLAKY115_API_KEY_AUTH")
	}
	serverURL, _ := root.PersistentFlags().GetString("server-url")

	// Allow client construction with an empty/placeholder key so doctor
	// and --help still work without auth.
	if apiKey == "" {
		apiKey = "missing"
	}
	return plakysdk.New(plakysdk.ClientOptions{APIKey: apiKey, ServerURL: serverURL})
}

func newDoctorCommand(c *plakysdk.Client) *cobra.Command {
	return &cobra.Command{
		Use:   "doctor",
		Short: "Print CLI configuration and basic status",
		RunE: func(cmd *cobra.Command, args []string) error {
			configured := "no"
			if c.APIKey() != "" && c.APIKey() != "missing" {
				configured = "yes"
			}
			_, err := fmt.Fprintf(cmd.OutOrStdout(), "plaky115 doctor\n  serverURL        : %s\n  apiKeyConfigured : %s\n", c.ServerURL(), configured)
			return err
		},
	}
}
