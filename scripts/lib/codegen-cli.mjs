import { pathParams } from "./codegen-operations.mjs";

export function buildCobraCommand(op) {
  const params = pathParams(op.path);
  const useSlug = goSlug(op.operationId);
  const fnName = `new${cap(op.operationId)}Cmd`;
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=${op.operationId}`);
  lines.push(`package raw`);
  lines.push(``);
  lines.push(`import (`);
  lines.push(`\t"github.com/apet97/plaky115-cli/internal/plakydx"`);
  lines.push(`\t"github.com/spf13/cobra"`);
  lines.push(`)`);
  lines.push(``);
  lines.push(`func ${fnName}(getClient ClientFactory) *cobra.Command {`);
  lines.push(`\tcmd := &cobra.Command{`);
  lines.push(`\t\tUse:   ${JSON.stringify(useSlug)},`);
  lines.push(`\t\tShort: ${JSON.stringify(op.summary ?? op.operationId)},`);
  lines.push(`\t\tRunE: func(cmd *cobra.Command, args []string) error {`);
  lines.push(`\t\t\tclient, err := getClient(cmd)`);
  lines.push(`\t\t\tif err != nil {`);
  lines.push(`\t\t\t\treturn err`);
  lines.push(`\t\t\t}`);
  lines.push(`\t\t\tctx := cmd.Context()`);
  lines.push(`\t\t\treturn plakydx.Run${cap(op.operationId)}(ctx, cmd, client)`);
  lines.push(`\t\t},`);
  lines.push(`\t}`);
  for (const p of params) lines.push(`\tcmd.Flags().String(${JSON.stringify(flagFor(p))}, "", ${JSON.stringify(p + " (required)")})`);
  if (op.pagination) {
    lines.push(`\tcmd.Flags().Int("page", 0, "Page number (1-based)")`);
    lines.push(`\tcmd.Flags().Int("page-size", 0, "Page size")`);
  }
  if (op.method !== "GET" && op.method !== "DELETE") {
    lines.push(`\tcmd.Flags().String("body", "", "Request body JSON or @file.json")`);
  }
  lines.push(`\treturn cmd`);
  lines.push(`}`);
  lines.push(``);
  return lines.join("\n");
}

export function buildRawRoot(ops) {
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json`);
  lines.push(`package raw`);
  lines.push(``);
  lines.push(`import (`);
  lines.push(`\t"github.com/apet97/plaky115-cli/internal/plakysdk"`);
  lines.push(`\t"github.com/spf13/cobra"`);
  lines.push(`)`);
  lines.push(``);
  lines.push(`type ClientFactory func(*cobra.Command) (*plakysdk.Client, error)`);
  lines.push(``);
  lines.push(`func NewRawRoot(getClient ClientFactory) *cobra.Command {`);
  lines.push(`\troot := &cobra.Command{Use: "raw", Short: "Direct Plaky API operations (one command per OpenAPI operation)."}`);
  for (const op of ops) lines.push(`\troot.AddCommand(new${cap(op.operationId)}Cmd(getClient))`);
  lines.push(`\treturn root`);
  lines.push(`}`);
  lines.push(``);
  return lines.join("\n");
}

export function buildGoOperations(ops) {
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json`);
  lines.push(`// Regenerate: npm run generate:cli`);
  lines.push(`package plakysdk`);
  lines.push(``);
  lines.push(`import (`);
  lines.push(`\t"context"`);
  lines.push(`\t"fmt"`);
  lines.push(`\t"net/url"`);
  lines.push(`\t"strings"`);
  lines.push(`)`);
  lines.push(``);
  lines.push(`var _ = context.Background`);
  lines.push(`var _ = fmt.Sprintf`);
  lines.push(`var _ = url.Values{}`);
  lines.push(`var _ = strings.NewReader`);
  lines.push(``);
  for (const op of ops) {
    const params = pathParams(op.path);
    const hasBody = op.method !== "GET" && op.method !== "DELETE";
    const fn = cap(op.operationId);
    lines.push(`// ${fn} executes the ${op.operationId} operation: ${op.method} ${op.path}`);
    lines.push(`func (c *Client) ${fn}(ctx context.Context, opts ${fn}Options) (any, error) {`);
    lines.push(`\tpath := ${formatGoPath(op.path, params)}`);
    if (op.pagination) {
      lines.push(`\tquery := url.Values{}`);
      lines.push(`\tif opts.Page > 0 {`);
      lines.push(`\t\tquery.Set("page", fmt.Sprintf("%d", opts.Page))`);
      lines.push(`\t}`);
      lines.push(`\tif opts.PageSize > 0 {`);
      lines.push(`\t\tquery.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))`);
      lines.push(`\t}`);
    }
    lines.push(`\treq := Request{Method: ${JSON.stringify(op.method)}, Path: path}`);
    if (op.pagination) lines.push(`\treq.Query = query`);
    if (hasBody) lines.push(`\treq.Body = opts.Body`);
    if (op.method !== "GET" && op.method !== "DELETE") lines.push(`\treq.Idempotency = opts.IdempotencyKey`);
    lines.push(`\tvar out any`);
    lines.push(`\tif err := c.Do(ctx, req, &out); err != nil {`);
    lines.push(`\t\treturn nil, err`);
    lines.push(`\t}`);
    lines.push(`\treturn out, nil`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`type ${fn}Options struct {`);
    for (const p of params) lines.push(`\t${cap(p)} string`);
    if (op.pagination) {
      lines.push(`\tPage int`);
      lines.push(`\tPageSize int`);
    }
    if (hasBody) lines.push(`\tBody any`);
    if (op.method !== "GET" && op.method !== "DELETE") lines.push(`\tIdempotencyKey string`);
    lines.push(`}`);
    lines.push(``);
  }
  return lines.join("\n");
}

function formatGoPath(path, params) {
  if (params.length === 0) return JSON.stringify(path);
  let expr = JSON.stringify(path);
  for (const p of params) {
    expr = `strings.ReplaceAll(${expr}, "{${p}}", opts.${cap(p)})`;
  }
  return expr;
}

function cap(s) { return s[0].toUpperCase() + s.slice(1); }
function flagFor(p) { return p.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(); }
function goSlug(operationId) { return operationId.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, ""); }
