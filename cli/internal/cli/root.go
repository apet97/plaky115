// Package cli wires the plaky115 CLI root and curated commands.
package cli

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strings"
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
	root.PersistentFlags().String("api-key", "", "Deprecated: Plaky API key in argv; prefer PLAKY115_API_KEY or --api-key-stdin")
	root.PersistentFlags().Bool("api-key-stdin", false, "Read the Plaky API key as one line from stdin")
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
	root.AddCommand(newItemGroupsListCommand(getClient))
	root.AddCommand(newItemGroupsCreateCommand(getClient))
	root.AddCommand(newItemGroupsArchiveCommand(getClient))
	root.AddCommand(newItemFilesListCommand(getClient))
	root.AddCommand(newItemFilesUploadCommand(getClient))
	root.AddCommand(newItemFilesDownloadLinkCommand(getClient))
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
	readStdin, _ := root.PersistentFlags().GetBool("api-key-stdin")
	if root.PersistentFlags().Changed("api-key") {
		if readStdin {
			return nil, fmt.Errorf("--api-key and --api-key-stdin cannot be used together")
		}
		_, _ = fmt.Fprintln(root.ErrOrStderr(), "warning: --api-key exposes credentials through argv; prefer PLAKY115_API_KEY or --api-key-stdin")
	} else if readStdin {
		value, err := readAPIKey(root.InOrStdin())
		if err != nil {
			return nil, err
		}
		apiKey = value
	} else {
		apiKey = os.Getenv("PLAKY115_API_KEY")
		if apiKey == "" {
			apiKey = os.Getenv("PLAKY115_API_KEY_AUTH")
		}
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
		if parsed < 0 {
			return nil, fmt.Errorf("--timeout must be non-negative")
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

func readAPIKey(input io.Reader) (string, error) {
	reader := bufio.NewReader(io.LimitReader(input, 8*1024+2))
	line, err := reader.ReadString('\n')
	if err != nil && err != io.EOF {
		return "", fmt.Errorf("read --api-key-stdin: %w", err)
	}
	key := strings.TrimSuffix(strings.TrimSuffix(line, "\n"), "\r")
	if strings.TrimSpace(key) == "" {
		return "", fmt.Errorf("--api-key-stdin requires one non-empty line")
	}
	extra, err := io.ReadAll(reader)
	if err != nil {
		return "", fmt.Errorf("read --api-key-stdin: %w", err)
	}
	if len(extra) > 0 {
		return "", fmt.Errorf("--api-key-stdin accepts exactly one line")
	}
	return key, nil
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
