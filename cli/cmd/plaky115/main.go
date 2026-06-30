package main

import (
	"os"

	"github.com/apet97/plaky115-cli/internal/cli"
)

// Injected at build time via GoReleaser ldflags (-X main.version / -X main.buildTime).
var (
	version   = "dev"
	buildTime = "unknown"
)

func main() {
	cli.Version = version
	cli.BuildTime = buildTime
	os.Exit(cli.Run(os.Args[1:], os.Stdout, os.Stderr))
}
