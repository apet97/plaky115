import { spawnSync } from "node:child_process";
import { describeOperation } from "./codegen-common.mjs";

export function buildCobraCommand(op) {
  const descriptor = describeOperation(op);
  const { pathParameters, queryParameters } = descriptor;
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
  lines.push(`\t\tArgs:  cobra.NoArgs,`);
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
  if (descriptor.requestKind === "json") {
    const required = op.request.required ? " (required)" : "";
    lines.push(`\tcmd.Flags().String("body", "", "Request body JSON, @file.json, or @- for stdin${required}")`);
  } else if (descriptor.requestKind === "multipart") {
    lines.push(`\tcmd.Flags().String("file", "", "File to upload; use - for stdin (required)")`);
    lines.push(`\tcmd.Flags().String("filename", "", "Multipart filename; required with --file - and otherwise defaults to the path basename")`);
    lines.push(`\tcmd.Flags().String("content-type", "", "Optional file media type, such as application/pdf")`);
  }
  if (descriptor.acceptsIdempotencyKey) {
    lines.push(`\tcmd.Flags().String("idempotency-key", "", "Idempotency-Key header for safe write retries")`);
  }
  if (op.confirmation === "destructive") {
    lines.push(`\tcmd.Flags().Bool("confirm", false, "Confirm execution of this destructive raw operation")`);
  }
  lines.push(`\treturn cmd`);
  lines.push(`}`);
  lines.push(``);
  return formatGo(lines.join("\n"));
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
  return formatGo(lines.join("\n"));
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
    const descriptor = describeOperation(op);
    const { pathParameters, queryParameters } = descriptor;
    const hasQuery = queryParameters.length > 0;
    const fn = cap(op.operationId);
    lines.push(`// ${fn} executes the ${op.operationId} operation: ${op.method} ${op.path}`);
    const returnType = descriptor.isVoid ? "error" : "(any, error)";
    lines.push(`func (c *Client) ${fn}(ctx context.Context, opts ${fn}Options) ${returnType} {`);
    for (const parameter of pathParameters.filter(isInt64)) {
      lines.push(`\tif _, err := CanonicalInt64ID(opts.${cap(parameter.name)}); err != nil {`);
      lines.push(descriptor.isVoid ? `\t\treturn err` : `\t\treturn nil, err`);
      lines.push(`\t}`);
    }
    for (const parameter of queryParameters) {
      lines.push(...goIntegerBoundsLines(op, descriptor, parameter));
    }
    lines.push(`\tpath := ${formatGoPath(op.path, pathParameters.map(({ name }) => name))}`);
    if (hasQuery) {
      lines.push(`\tquery := url.Values{}`);
      for (const parameter of queryParameters) lines.push(...goQueryLines(parameter));
    }
    lines.push(`\treq := Request{Method: ${JSON.stringify(op.method)}, Path: path}`);
    if (hasQuery) lines.push(`\treq.Query = query`);
    if (descriptor.requestKind === "json") {
      lines.push(`\tjsonBody := opts.JSONBody`);
      lines.push(`\tif jsonBody == nil {`);
      lines.push(`\t\tjsonBody = opts.Body`);
      lines.push(`\t}`);
      lines.push(`\tif err := ValidateJSONBody(jsonBody, ${op.request.required === true}${goStringArguments(descriptor.requestRequiredProperties)}); err != nil {`);
      lines.push(`\t\t${goErrorReturn(descriptor, "err")}`);
      lines.push(`\t}`);
      lines.push(`\treq.JSONBody = jsonBody`);
    }
    if (descriptor.requestKind === "multipart") lines.push(`\treq.Multipart = opts.Multipart`);
    if (descriptor.acceptsIdempotencyKey) lines.push(`\treq.Idempotency = opts.IdempotencyKey`);
    if (descriptor.isVoid) {
      lines.push(`\treturn c.Do(ctx, req, nil)`);
    } else {
      lines.push(`\tvar out any`);
      lines.push(`\tif err := c.Do(ctx, req, &out); err != nil {`);
      lines.push(`\t\treturn nil, err`);
      lines.push(`\t}`);
      lines.push(`\tif err := ValidateResponseShape(${JSON.stringify(op.operationId)}, ${JSON.stringify(responseKind(descriptor))}, out, ${goStringSlice(descriptor.successRequiredProperties)}, ${descriptor.createdIdPointer === "$.id"}, ${descriptor.sensitiveLink}); err != nil {`);
      lines.push(`\t\treturn nil, err`);
      lines.push(`\t}`);
      lines.push(`\treturn out, nil`);
    }
    lines.push(`}`);
    lines.push(``);
    lines.push(`type ${fn}Options struct {`);
    for (const parameter of pathParameters) lines.push(`\t${cap(parameter.name)} string`);
    for (const parameter of queryParameters) lines.push(`\t${cap(parameter.name)} ${goOptionType(parameter)}`);
    if (descriptor.requestKind === "json") {
      lines.push(`\tJSONBody any`);
      lines.push(`\t// Body is retained for compatibility with curated CLI workflows.`);
      lines.push(`\t// Deprecated: use JSONBody.`);
      lines.push(`\tBody any`);
    }
    if (descriptor.requestKind === "multipart") lines.push(`\tMultipart *MultipartFileBody`);
    if (descriptor.acceptsIdempotencyKey) lines.push(`\tIdempotencyKey string`);
    lines.push(`}`);
    lines.push(``);
  }
  return formatGo(lines.join("\n"));
}

export function buildGoRunners(ops) {
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json`);
  lines.push(`// Regenerate: npm run generate:cli`);
  lines.push(`package plakydx`);
  lines.push(``);
  lines.push(`import (`);
  lines.push(`\t"context"`);
  lines.push(``);
  lines.push(`\t"github.com/apet97/plaky115-cli/internal/plakysdk"`);
  lines.push(`\t"github.com/spf13/cobra"`);
  lines.push(`)`);
  lines.push(``);
  for (const op of ops) lines.push(...goRunnerLines(op));
  return formatGo(lines.join("\n"));
}

function goRunnerLines(op) {
  const descriptor = describeOperation(op);
  const fn = cap(op.operationId);
  const lines = [];
  lines.push(`// Run${fn} reads raw flags and executes ${op.operationId}.`);
  lines.push(`func Run${fn}(ctx context.Context, cmd *cobra.Command, c *plakysdk.Client) error {`);
  if (op.confirmation === "destructive") {
    lines.push(`\tif err := confirmationFlag(cmd); err != nil {`);
    lines.push(`\t\treturn err`);
    lines.push(`\t}`);
  }
  for (const parameter of descriptor.pathParameters) {
    lines.push(...runnerFlagRead(parameter, true));
  }
  for (const parameter of descriptor.queryParameters) {
    lines.push(...runnerFlagRead(parameter, false));
  }
  if (descriptor.requestKind === "json") {
    lines.push(`\tjsonBody, err := jsonBodyFlag(cmd, ${op.request.required === true}${goStringArguments(descriptor.requestRequiredProperties)})`);
    lines.push(`\tif err != nil {`);
    lines.push(`\t\treturn err`);
    lines.push(`\t}`);
  }
  if (descriptor.requestKind === "multipart") {
    lines.push(`\tupload, err := openUploadFlag(cmd)`);
    lines.push(`\tif err != nil {`);
    lines.push(`\t\treturn err`);
    lines.push(`\t}`);
    lines.push(`\tdefer upload.Close()`);
  }
  if (descriptor.acceptsIdempotencyKey) {
    lines.push(`\tidempotencyKey, err := optionalStringFlag(cmd, "idempotency-key")`);
    lines.push(`\tif err != nil {`);
    lines.push(`\t\treturn err`);
    lines.push(`\t}`);
  }
  lines.push(`\topts := plakysdk.${fn}Options{`);
  for (const parameter of descriptor.pathParameters) {
    lines.push(`\t\t${cap(parameter.name)}: ${localName(parameter.name)},`);
  }
  for (const parameter of descriptor.queryParameters) {
    lines.push(`\t\t${cap(parameter.name)}: ${localName(parameter.name)},`);
  }
  if (descriptor.requestKind === "json") lines.push(`\t\tJSONBody: jsonBody,`);
  if (descriptor.requestKind === "multipart") {
    lines.push(`\t\tMultipart: &plakysdk.MultipartFileBody{`);
    lines.push(`\t\t\tReader: upload.Reader,`);
    lines.push(`\t\t\tFileName: upload.FileName,`);
    lines.push(`\t\t\tContentType: upload.ContentType,`);
    lines.push(`\t\t},`);
  }
  if (descriptor.acceptsIdempotencyKey) lines.push(`\t\tIdempotencyKey: idempotencyKey,`);
  lines.push(`\t}`);
  if (descriptor.isVoid) {
    lines.push(`\tif err := c.${fn}(ctx, opts); err != nil {`);
    lines.push(`\t\treturn err`);
    lines.push(`\t}`);
    lines.push(`\treturn emitVoid(cmd)`);
  } else {
    lines.push(`\tout, err := c.${fn}(ctx, opts)`);
    lines.push(`\tif err != nil {`);
    lines.push(`\t\treturn err`);
    lines.push(`\t}`);
    lines.push(`\treturn EmitJSON(cmd, out)`);
  }
  lines.push(`}`);
  lines.push(``);
  return lines;
}

function formatGoPath(path, params) {
  if (params.length === 0) return JSON.stringify(path);
  let expr = JSON.stringify(path);
  for (const p of params) {
    expr = `strings.ReplaceAll(${expr}, "{${p}}", url.PathEscape(opts.${cap(p)}))`;
  }
  return expr;
}

function goQueryLines(parameter) {
  const field = `opts.${cap(parameter.name)}`;
  const name = JSON.stringify(parameter.name);
  switch (parameter.schema.type) {
    case "string":
      return [`\tif ${field} != "" {`, `\t\tquery.Set(${name}, ${field})`, `\t}`];
    case "integer":
      return [`\tif ${field} != 0 {`, `\t\tquery.Set(${name}, fmt.Sprintf("%d", ${field}))`, `\t}`];
    case "number":
      return [`\tif ${field} != nil {`, `\t\tquery.Set(${name}, fmt.Sprintf("%g", *${field}))`, `\t}`];
    case "boolean":
      return [`\tif ${field} != nil {`, `\t\tquery.Set(${name}, fmt.Sprintf("%t", *${field}))`, `\t}`];
    case "array":
      if (parameter.schema.items?.type !== "string") {
        throw new Error(`${parameter.name}: only string-array Go query options are supported`);
      }
      if (parameter.explode === false) {
        return [`\tif len(${field}) > 0 {`, `\t\tquery.Set(${name}, strings.Join(${field}, ","))`, `\t}`];
      }
      return [`\tfor _, value := range ${field} {`, `\t\tquery.Add(${name}, value)`, `\t}`];
    default: throw new Error(`${parameter.name}: unsupported Go query type ${parameter.schema.type}`);
  }
}

function goIntegerBoundsLines(op, descriptor, parameter) {
  const bounds = integerBounds(parameter.schema);
  if (!bounds) return [];
  const field = `opts.${cap(parameter.name)}`;
  const lines = [];
  const errorReturn = (message) => `\t\t${goErrorReturn(descriptor, `fmt.Errorf(${JSON.stringify(message)})`)}`;
  if (bounds.minimum !== undefined) {
    lines.push(`\tif ${field} != 0 && ${field} < ${goNumberLiteral(bounds.minimum)} {`);
    lines.push(errorReturn(`${op.operationId}: ${parameter.name} must be at least ${bounds.minimum}`));
    lines.push(`\t}`);
  }
  if (bounds.maximum !== undefined) {
    lines.push(`\tif ${field} > ${goNumberLiteral(bounds.maximum)} {`);
    lines.push(errorReturn(`${op.operationId}: ${parameter.name} must be at most ${bounds.maximum}`));
    lines.push(`\t}`);
  }
  return lines;
}

function goOptionType(parameter) {
  switch (parameter.schema.type) {
    case "string": return "string";
    case "integer": return parameter.schema.format === "int64" ? "int64" : "int";
    case "number": return "*float64";
    case "boolean": return "*bool";
    case "array":
      if (parameter.schema.items?.type !== "string") {
        throw new Error(`${parameter.name}: only string-array Go query options are supported`);
      }
      return "[]string";
    default: throw new Error(`${parameter.name}: unsupported Go option type ${parameter.schema.type}`);
  }
}

function runnerFlagRead(parameter, required) {
  const variable = localName(parameter.name);
  const flag = JSON.stringify(flagFor(parameter.name));
  let helper;
  if (required) helper = isInt64(parameter) ? "requiredInt64IDFlag" : "requiredStringFlag";
  else {
    switch (parameter.schema.type) {
      case "string": helper = "optionalStringFlag"; break;
      case "integer": helper = parameter.schema.format === "int64" ? "optionalInt64Flag" : "optionalIntFlag"; break;
      case "number": helper = "optionalFloat64Flag"; break;
      case "boolean": helper = "optionalBoolFlag"; break;
      case "array": helper = "optionalStringArrayFlag"; break;
      default: throw new Error(`${parameter.name}: unsupported runner flag type ${parameter.schema.type}`);
    }
  }
  const helperArguments = [`cmd`, flag];
  if (!required && helper === "optionalIntFlag") {
    const bounds = integerBounds(parameter.schema);
    if (bounds?.minimum !== undefined) helperArguments.push(goNumberLiteral(bounds.minimum));
    if (bounds?.maximum !== undefined) {
      if (bounds.minimum === undefined) helperArguments.push("0");
      helperArguments.push(goNumberLiteral(bounds.maximum));
    }
  }
  return [
    `\t${variable}, err := ${helper}(${helperArguments.join(", ")})`,
    `\tif err != nil {`,
    `\t\treturn err`,
    `\t}`,
  ];
}

function isInt64(parameter) {
  return parameter.schema.type === "integer" && parameter.schema.format === "int64";
}

function responseKind(descriptor) {
  if (descriptor.isPaged) return "paged-object";
  if (descriptor.isArray) return "json-array";
  if (descriptor.isVoid) return "void";
  return "json-object";
}

function integerBounds(schema) {
  if (schema?.type !== "integer" || schema.format === "int64") return null;
  if (schema.minimum === undefined && schema.maximum === undefined) return null;
  return { minimum: schema.minimum, maximum: schema.maximum };
}

function goNumberLiteral(value) {
  return JSON.stringify(value);
}

function goStringArguments(values) {
  return values.map((value) => `, ${JSON.stringify(value)}`).join("");
}

function goStringSlice(values) {
  return `[]string{${values.map((value) => JSON.stringify(value)).join(", ")}}`;
}

function goErrorReturn(descriptor, expression) {
  return descriptor.isVoid ? `return ${expression}` : `return nil, ${expression}`;
}

function localName(name) {
  const value = name[0].toLowerCase() + name.slice(1);
  const keywords = new Set([
    "break", "case", "chan", "const", "continue", "default", "defer", "else", "fallthrough",
    "for", "func", "go", "goto", "if", "import", "interface", "map", "package", "range",
    "return", "select", "struct", "switch", "type", "var",
  ]);
  return keywords.has(value) ? `${value}Value` : value;
}

// A query param serialized as repeated keys (explode=true array, e.g. `emails`).
// `expand` is an array but explode=false (comma-joined), so it stays a string.
function repeatedArray(q) { return q.array === true && q.explode !== false; }
function cap(s) { return s[0].toUpperCase() + s.slice(1); }
function flagFor(p) { return p.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(); }
function goSlug(operationId) { return operationId.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, ""); }

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

function formatGo(source) {
  const result = spawnSync("gofmt", { input: source, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`gofmt failed: ${result.stderr}`);
  return result.stdout;
}
