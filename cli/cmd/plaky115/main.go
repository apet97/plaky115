package main

import (
	"os"

	"github.com/apet97/plaky115-cli/internal/cli"
)

func main() {
	root, err := cli.NewRootCommand()
	if err != nil {
		cli.PrintError(os.Stderr, err, false)
		os.Exit(1)
	}
	if err := root.Execute(); err != nil {
		// The persistent --json flag is parsed during Execute, so it is
		// readable even on the failure path (defaults to false on a parse error).
		asJSON, _ := root.PersistentFlags().GetBool("json")
		cli.PrintError(os.Stderr, err, asJSON)
		os.Exit(1)
	}
}
