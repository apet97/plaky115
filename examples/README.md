# Examples

Runnable, secret-free examples for the Plaky115 SDK, CLI, and MCP server. Every
example reads credentials from the environment. None contain literal keys.

## Credentials

```bash
export PLAKY115_API_KEY=...                 # required
export PLAKY115_SPACE_ID=...                # for item/board examples
export PLAKY115_BOARD_ID=...                # for item examples
# Real workspaces are account-prefixed; set this when the generic host does not route:
export PLAKY115_BASE_URL=https://<account>.api.plaky.com
```

Never commit or print `plk_` values. Rotate any key used against a real workspace.

## SDK examples

The SDK examples import the local package via `file:../sdk`. Build and link once:

```bash
npm --prefix ../sdk run build
npm install            # from this examples/ directory; links plaky115 -> ../sdk
```

Then run any script:

```bash
node sdk/01-auth-and-list.mjs
node sdk/02-paginate.mjs
node sdk/03-fields-and-create.mjs        # previews the payload (dry-run); set CREATE=1 to write a sacrificial item (use a smoke board)
node sdk/04-error-handling.mjs
node sdk/05-request-with-response.mjs
```

## CLI examples

```bash
(cd ../cli && go build -o /tmp/plaky115 ./cmd/plaky115)
PATH="/tmp:$PATH" bash cli/recipes.sh
```

`recipes.sh` runs read-only and dry-run commands only.

## MCP examples

- `mcp/claude_desktop_config.json` is a host config snippet.
- `mcp/recipes.md` lists curated tool calls.
