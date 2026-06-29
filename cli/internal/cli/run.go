package cli

import "io"

// Run builds and executes the root command, writing any error to stderr — as a
// JSON envelope when the global --json flag is set — and returns a process exit
// code. main() is a thin wrapper around this so the failure and --json paths are
// testable without spawning a binary.
func Run(args []string, stdout, stderr io.Writer) int {
	root, err := NewRootCommand()
	if err != nil {
		PrintError(stderr, err, false)
		return 1
	}
	root.SetArgs(args)
	root.SetOut(stdout)
	root.SetErr(stderr)
	if err := root.Execute(); err != nil {
		// The persistent --json flag is parsed during Execute, so it is readable
		// even on the failure path (defaults to false on a parse error).
		asJSON, _ := root.PersistentFlags().GetBool("json")
		PrintError(stderr, err, asJSON)
		return 1
	}
	return 0
}
