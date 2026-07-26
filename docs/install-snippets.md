# Install Snippets

Plaky115 is an unofficial toolkit for the Plaky public API. It is not an
official Plaky or CAKE.com package.

The SDK and MCP packages require Node.js `>=22.12`.

## Claude Desktop

```json
{
  "mcpServers": {
    "plaky115": {
      "command": "npx",
      "args": ["--yes", "--package", "/absolute/path/to/mcp-server", "--", "mcp"],
      "env": {
        "PLAKY115_API_KEY": "set-this-in-your-secret-store"
      }
    }
  }
}
```

## Claude Code

```bash
claude mcp add plaky115 -- npx --yes --package /absolute/path/to/mcp-server -- mcp
```

Set `PLAKY115_API_KEY` in the shell or Claude Code environment configuration.

## Cursor

```json
{
  "mcpServers": {
    "plaky115": {
      "command": "npx",
      "args": ["--yes", "--package", "/absolute/path/to/mcp-server", "--", "mcp", "--mode", "all", "--scope", "read", "--scope", "write", "--scope", "destructive"],
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
./plaky115 doctor
./plaky115 raw list-spaces --page-size 5
```
