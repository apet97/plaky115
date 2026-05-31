package main

import (
	"os"

	"github.com/apet97/plaky115-cli/internal/cli"
)

func main() {
	root, err := cli.NewRootCommand()
	if err != nil {
		cli.PrintError(os.Stderr, err)
		os.Exit(1)
	}
	if err := root.Execute(); err != nil {
		cli.PrintError(os.Stderr, err)
		os.Exit(1)
	}
}
