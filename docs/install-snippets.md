# Install Snippets

Plaky115 is an unofficial toolkit for the Plaky public API. It is not an
official Plaky or CAKE.com package.

## Claude Desktop

```json
{
  "mcpServers": {
    "plaky115": {
      "command": "npx",
      "args": ["--yes", "--package", "/absolute/path/to/mcp-server", "--", "mcp", "start", "--mode", "curated"],
      "env": {
        "PLAKY115_API_KEY": "set-this-in-your-secret-store"
      }
    }
  }
}
```

## Claude Code

```bash
claude mcp add plaky115 -- npx --yes --package /absolute/path/to/mcp-server -- mcp start --mode curated
```

Set `PLAKY115_API_KEY` in the shell or Claude Code environment configuration.

## Cursor

```json
{
  "mcpServers": {
    "plaky115": {
      "command": "npx",
      "args": ["--yes", "--package", "/absolute/path/to/mcp-server", "--", "mcp", "start", "--mode", "all"],
      "env": {
        "PLAKY115_API_KEY": "set-this-in-your-secret-store"
      }
    }
  }
}
```

## Local CLI

```bash
cd cli
go build -o plaky115 ./cmd/plaky115
export PLAKY115_API_KEY=...
./plaky115 doctor --live -o json
```
