import { pathParams } from "./codegen-common.mjs";

export function buildCobraCommand(op) {
  const pathParameters = op.parameters.filter((parameter) => parameter.in === "path");
  const queryParameters = uniqueParameters([
    ...op.parameters.filter((parameter) => parameter.in === "query"),
    ...(op.pagination?.inputs ?? []),
  ]);
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
  for (const parameter of pathParameters) {
    lines.push(`\tcmd.Flags().String(${JSON.stringify(flagFor(parameter.name))}, "", ${JSON.stringify(flagDescription(parameter))})`);
  }
  for (const parameter of queryParameters) {
    lines.push(cobraFlagLine(parameter));
  }
  if (op.request.kind === "json") {
    const required = op.request.required ? " (required)" : "";
    lines.push(`\tcmd.Flags().String("body", "", "Request body JSON, @file.json, or @- for stdin${required}")`);
  } else if (op.request.kind === "multipart") {
    validateMultipartRequest(op);
    lines.push(`\tcmd.Flags().String("file", "", "File to upload; use - for stdin (required)")`);
    lines.push(`\tcmd.Flags().String("filename", "", "Multipart filename; required with --file - and otherwise defaults to the path basename")`);
    lines.push(`\tcmd.Flags().String("content-type", "", "Optional file media type, such as application/pdf")`);
  }
  if (op.mutation && op.request.kind !== "none") {
    lines.push(`\tcmd.Flags().String("idempotency-key", "", "Idempotency-Key header for safe write retries")`);
  }
  if (op.confirmation === "destructive") {
    lines.push(`\tcmd.Flags().Bool("confirm", false, "Confirm execution of this destructive raw operation")`);
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
    const queryParams = op.query ?? [];
    const hasQuery = Boolean(op.pagination) || queryParams.length > 0;
    const fn = cap(op.operationId);
    lines.push(`// ${fn} executes the ${op.operationId} operation: ${op.method} ${op.path}`);
    lines.push(`func (c *Client) ${fn}(ctx context.Context, opts ${fn}Options) (any, error) {`);
    lines.push(`\tpath := ${formatGoPath(op.path, params)}`);
    if (hasQuery) {
      lines.push(`\tquery := url.Values{}`);
      if (op.pagination) {
        lines.push(`\tif opts.Page > 0 {`);
        lines.push(`\t\tquery.Set("page", fmt.Sprintf("%d", opts.Page))`);
        lines.push(`\t}`);
        lines.push(`\tif opts.PageSize > 0 {`);
        lines.push(`\t\tquery.Set("pageSize", fmt.Sprintf("%d", opts.PageSize))`);
        lines.push(`\t}`);
      }
      for (const q of queryParams) {
        if (repeatedArray(q)) {
          lines.push(`\tfor _, v := range opts.${cap(q.name)} {`);
          lines.push(`\t\tquery.Add(${JSON.stringify(q.name)}, v)`);
          lines.push(`\t}`);
        } else {
          lines.push(`\tif opts.${cap(q.name)} != "" {`);
          lines.push(`\t\tquery.Set(${JSON.stringify(q.name)}, opts.${cap(q.name)})`);
          lines.push(`\t}`);
        }
      }
    }
    lines.push(`\treq := Request{Method: ${JSON.stringify(op.method)}, Path: path}`);
    if (hasQuery) lines.push(`\treq.Query = query`);
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
    for (const q of queryParams) lines.push(`\t${cap(q.name)} ${repeatedArray(q) ? "[]string" : "string"}`);
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
    expr = `strings.ReplaceAll(${expr}, "{${p}}", url.PathEscape(opts.${cap(p)}))`;
  }
  return expr;
}

// A query param serialized as repeated keys (explode=true array, e.g. `emails`).
// `expand` is an array but explode=false (comma-joined), so it stays a string.
function repeatedArray(q) { return q.array === true && q.explode !== false; }
function cap(s) { return s[0].toUpperCase() + s.slice(1); }
function flagFor(p) { return p.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(); }
function goSlug(operationId) { return operationId.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, ""); }

function uniqueParameters(parameters) {
  const seen = new Set();
  return parameters.filter(({ name }) => {
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

function cobraFlagLine(parameter) {
  const name = JSON.stringify(flagFor(parameter.name));
  const description = JSON.stringify(flagDescription(parameter));
  const schema = parameter.schema;
  switch (schema.type) {
    case "string": return `\tcmd.Flags().String(${name}, "", ${description})`;
    case "integer": return schema.format === "int64"
      ? `\tcmd.Flags().Int64(${name}, 0, ${description})`
      : `\tcmd.Flags().Int(${name}, 0, ${description})`;
    case "number": return `\tcmd.Flags().Float64(${name}, 0, ${description})`;
    case "boolean": return `\tcmd.Flags().Bool(${name}, false, ${description})`;
    case "array":
      if (schema.items?.type !== "string") throw new Error(`${parameter.name}: only string-array CLI flags are supported`);
      return `\tcmd.Flags().StringArray(${name}, nil, ${description})`;
    default: throw new Error(`${parameter.name}: unsupported CLI flag type ${schema.type}`);
  }
}

function flagDescription(parameter) {
  const fallback = `${parameter.name} ${parameter.in} parameter for this Plaky operation`;
  const allowed = Array.isArray(parameter.schema.enum)
    ? ` Allowed values: ${parameter.schema.enum.join(", ")}.`
    : "";
  const required = parameter.required ? " (required)" : "";
  return `${collapseWhitespace(parameter.description ?? fallback)}${allowed}${required}`;
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function validateMultipartRequest(op) {
  const parts = op.request.parts;
  const valid = parts.length === 1
    && parts[0].name === "file"
    && parts[0].required === true
    && parts[0].type === "string"
    && parts[0].format === "binary";
  if (!valid) throw new Error(`${op.operationId}: expected a single required binary multipart part named file`);
}
