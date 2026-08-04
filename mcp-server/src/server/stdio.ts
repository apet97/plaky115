import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseArgs } from "node:util";
import { buildServer } from "./index.js";
import { parseMode, UsageError } from "./modes.js";
import { formatStartupError } from "./presentation.js";
import { parseScopes } from "./scopes.js";

async function main(): Promise<void> {
  let values: ReturnType<typeof parseArgs>["values"];
  try {
    ({ values } = parseArgs({
      options: {
        mode: { type: "string", default: "curated" },
        scope: { type: "string", multiple: true, default: [] as string[] },
        "server-url": { type: "string" },
        help: { type: "boolean", default: false },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }

  const mode = parseMode(values["mode"] as string | undefined);
  const scopes = parseScopes(values["scope"] as string[]);
  const serverURL = values["server-url"] as string | undefined;

  if (values["help"] === true) {
    process.stdout.write(helpText());
    return;
  }

  const apiKey = process.env["PLAKY115_API_KEY"] ?? process.env["PLAKY115_API_KEY_AUTH"] ?? "";
  if (!apiKey) {
    process.stderr.write("PLAKY115_API_KEY (or PLAKY115_API_KEY_AUTH) is required.\n");
    process.exit(1);
  }

  const { server } = buildServer({
    apiKey,
    mode,
    scopes,
    ...(serverURL ? { serverURL } : {}),
  });

  await server.connect(new StdioServerTransport());
}

function helpText(): string {
  return [
    "plaky115-mcp — Unofficial Plaky MCP server",
    "",
    "Usage: mcp [--mode curated|generated|all] [--scope read|write|destructive ...]",
    "           [--server-url https://api.plaky.com]",
    "",
    "Environment:",
    "  PLAKY115_API_KEY        Plaky API key (preferred)",
    "  PLAKY115_API_KEY_AUTH   Legacy fallback",
    "",
    "Modes:",
    "  curated    Curated workflow tools only",
    "  generated  One tool per raw operation",
    "  all        Both curated and raw tools",
    "",
    "Mode defaults to curated. Scopes default to read when --scope is omitted.",
    "Request broad access explicitly with --mode all and repeated --scope flags.",
    "",
  ].join("\n");
}

main().catch((err) => {
  const error = err instanceof Error ? err : new Error(String(err));
  const message = formatStartupError(error);
  if (error instanceof UsageError) {
    process.stderr.write(`${message}\nRun with --help for usage.\n`);
    process.exit(error.exitCode);
  }
  process.stderr.write(`mcp-server failed: ${message}\n`);
  process.exit(1);
});
