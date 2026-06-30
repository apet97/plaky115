// Package cli wires the plaky115 CLI root and curated commands.
package cli

import (
	"fmt"
	"os"
	"time"

	"github.com/apet97/plaky115-cli/internal/cli/raw"
	"github.com/apet97/plaky115-cli/internal/plakysdk"
	"github.com/spf13/cobra"
)

type clientFactory func(*cobra.Command) (*plakysdk.Client, error)

// Version and BuildTime are set from main() at startup, which receives them via
// GoReleaser ldflags. They default to dev values for `go run`/`go build`.
var (
	Version   = "dev"
	BuildTime = "unknown"
)

func NewRootCommand() (*cobra.Command, error) {
	root := &cobra.Command{
		Use:           "plaky115",
		Short:         "Unofficial Plaky115 CLI (hand-crafted toolkit).",
		Long:          "Plaky115 CLI: hand-crafted Plaky API client with raw operations under `plaky115 raw <op>` and curated workflows at top level. Not affiliated with Plaky or CAKE.com.",
		Version:       Version,
		SilenceUsage:  true,
		SilenceErrors: true,
	}
	root.SetVersionTemplate("plaky115 version {{.Version}} (built " + BuildTime + ")\n")

	root.PersistentFlags().String("server-url", "", "Override Plaky API base URL (default: https://api.plaky.com)")
	root.PersistentFlags().String("api-key", "", "Plaky API key (or set PLAKY115_API_KEY / PLAKY115_API_KEY_AUTH)")
	root.PersistentFlags().String("timeout", "", "HTTP timeout as a duration, for example 10s or 2m")
	root.PersistentFlags().String("user-agent", "", "Override the User-Agent sent to Plaky")
	root.PersistentFlags().Bool("json", false, "Emit errors as a JSON envelope on stderr")

	getClient := func(cmd *cobra.Command) (*plakysdk.Client, error) {
		return buildClient(cmd.Root())
	}

	root.AddCommand(raw.NewRawRoot(getClient))
	root.AddCommand(newDoctorCommand(getClient))
	root.AddCommand(newWorkspaceMapCommand(getClient))
	root.AddCommand(newFindCommand(getClient))
	root.AddCommand(newFieldsListCommand(getClient))
	root.AddCommand(newItemsCreateSimpleCommand(getClient))
	root.AddCommand(newItemsBulkUpdateCommand(getClient))
	root.AddCommand(newItemsExportCommand(getClient))
	root.AddCommand(newCommentsAddCommand(getClient))
	root.AddCommand(newCommentsThreadCommand(getClient))
	root.AddCommand(newReactionsReplaceCommand(getClient))
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
	timeoutText, _ := root.PersistentFlags().GetString("timeout")
	userAgent, _ := root.PersistentFlags().GetString("user-agent")
	if userAgent == "" {
		userAgent = "plaky115-cli/" + Version
	}
	var timeout time.Duration
	if timeoutText != "" {
		parsed, err := time.ParseDuration(timeoutText)
		if err != nil {
			return nil, fmt.Errorf("invalid --timeout: %w", err)
		}
		timeout = parsed
	}

	// Allow client construction with an empty/placeholder key so doctor
	// and --help still work without auth.
	if apiKey == "" {
		apiKey = "missing"
	}
	return plakysdk.New(plakysdk.ClientOptions{APIKey: apiKey, ServerURL: serverURL, Timeout: timeout, UserAgent: userAgent})
}

func newDoctorCommand(getClient clientFactory) *cobra.Command {
	return &cobra.Command{
		Use:   "doctor",
		Short: "Print CLI configuration and basic status",
		RunE: func(cmd *cobra.Command, args []string) error {
			c, err := getClient(cmd)
			if err != nil {
				return err
			}
			configured := "no"
			if c.APIKey() != "" && c.APIKey() != "missing" {
				configured = "yes"
			}
			_, err = fmt.Fprintf(cmd.OutOrStdout(), "plaky115 doctor\n  serverURL        : %s\n  apiKeyConfigured : %s\n", c.ServerURL(), configured)
			return err
		},
	}
}
