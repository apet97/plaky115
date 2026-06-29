package main

import (
	"os"

	"github.com/apet97/plaky115-cli/internal/cli"
)

func main() {
	os.Exit(cli.Run(os.Args[1:], os.Stdout, os.Stderr))
}
