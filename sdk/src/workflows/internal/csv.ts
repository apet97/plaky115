export type CsvSafety = "spreadsheet" | "raw";

type JsonRecord = Record<string, unknown>;

type FieldDescriptor = {
  identity: string;
  key?: string | undefined;
  label: string;
  missingIndex?: number | undefined;
  column?: string | undefined;
};

export type CsvSchema = {
  topKeys: string[];
  descriptors: FieldDescriptor[];
};

/**
 * Build a deterministic CSV schema from one page and the board's field
 * definitions. The seed page is intentionally bounded; later pages cannot
 * change the header or cause an unbounded discovery pass.
 */
export function createItemsCsvSchema(items: JsonRecord[], fieldDefinitions: JsonRecord[] = []): CsvSchema {
  const topKeys = Array.from(new Set(items.flatMap((item) => Object.keys(item).filter((key) => key !== "fields")))).sort(compareText);
  const descriptors = new Map<string, FieldDescriptor>();
  let missingOccurrence = 0;

  for (const definition of fieldDefinitions) {
    const label = fieldLabel(definition);
    if (label === "") continue;
    const key = typeof definition["key"] === "string" && definition["key"] !== "" ? definition["key"] : undefined;
    const identity = key === undefined ? `missing:${label}:${++missingOccurrence}` : `key:${key}`;
    if (!descriptors.has(identity)) descriptors.set(identity, { identity, key, label });
  }
  for (const item of items) collectFieldValues(item, descriptors);
  return finalizeCsvSchema(topKeys, descriptors);
}

/** Render one page against a previously frozen CSV schema. */
export function renderItemsCsvChunk(items: JsonRecord[], safety: CsvSafety, schema: CsvSchema, includeHeader: boolean): string {
  if (items.length === 0 && !includeHeader) return "";
  const fieldValues = items.map((item) => collectFieldValues(item, new Map(schema.descriptors.map((descriptor) => [descriptor.identity, descriptor]))));
  const header = [...schema.topKeys, ...schema.descriptors.map((descriptor) => descriptor.column!)];
  const lines = includeHeader ? [header.map(quoteCsv).join(",")] : [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index]!;
    const values = fieldValues[index]!;
    const row = [
      ...schema.topKeys.map((key) => formatCell(item[key], safety)),
      ...schema.descriptors.map((descriptor) => formatCell(values.get(descriptor.identity), safety)),
    ];
    lines.push(row.map(quoteCsv).join(","));
  }
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

export function renderItemsCsv(items: JsonRecord[], safety: CsvSafety): string {
  if (items.length === 0) return "";

  const topKeys = [...new Set(items.flatMap((item) => Object.keys(item).filter((key) => key !== "fields")))].sort(compareText);
  const topKeySet = new Set(topKeys);
  const descriptors = new Map<string, FieldDescriptor>();
  const fieldValues = items.map((item) => collectFieldValues(item, descriptors));
  const ordered = Array.from(descriptors.values()).sort((left, right) => compareText(left.label, right.label) || compareText(left.identity, right.identity));

  let missingIndex = 0;
  for (const descriptor of ordered) {
    if (descriptor.key === undefined) descriptor.missingIndex = ++missingIndex;
  }

  const labelCounts = new Map<string, number>();
  for (const descriptor of ordered) labelCounts.set(descriptor.label, (labelCounts.get(descriptor.label) ?? 0) + 1);
  const usedColumns = new Set(topKeys);
  for (const descriptor of ordered) {
    const collides = topKeySet.has(descriptor.label) || (labelCounts.get(descriptor.label) ?? 0) > 1;
    const base = collides
      ? descriptor.key !== undefined
        ? `${descriptor.label} [${descriptor.key}]`
        : `${descriptor.label} [#${descriptor.missingIndex}]`
      : descriptor.label;
    descriptor.column = uniqueColumn(base, usedColumns);
    usedColumns.add(descriptor.column);
  }

  const header = [...topKeys, ...ordered.map((descriptor) => descriptor.column!)];
  const lines = [header.map(quoteCsv).join(",")];
  for (let index = 0; index < items.length; index++) {
    const item = items[index]!;
    const values = fieldValues[index]!;
    const row = [
      ...topKeys.map((key) => formatCell(item[key], safety)),
      ...ordered.map((descriptor) => formatCell(values.get(descriptor.identity), safety)),
    ];
    lines.push(row.map(quoteCsv).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function collectFieldValues(item: JsonRecord, descriptors: Map<string, FieldDescriptor>): Map<string, unknown> {
  const values = new Map<string, unknown>();
  const missingOccurrences = new Map<string, number>();
  if (!Array.isArray(item["fields"])) return values;

  for (const value of item["fields"]) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
    const field = value as JsonRecord;
    const key = typeof field["key"] === "string" && field["key"] !== "" ? field["key"] : undefined;
    const label = fieldLabel(field);
    if (label === "") continue;
    let identity: string;
    if (key !== undefined) {
      identity = `key:${key}`;
    } else {
      const occurrence = (missingOccurrences.get(label) ?? 0) + 1;
      missingOccurrences.set(label, occurrence);
      identity = `missing:${label}:${occurrence}`;
    }
    if (!descriptors.has(identity)) descriptors.set(identity, { identity, key, label });
    if (!values.has(identity)) values.set(identity, field["value"]);
  }
  return values;
}

function finalizeCsvSchema(topKeys: string[], descriptors: Map<string, FieldDescriptor>): CsvSchema {
  const ordered = Array.from(descriptors.values()).sort((left, right) => compareText(left.label, right.label) || compareText(left.identity, right.identity));
  let missingIndex = 0;
  for (const descriptor of ordered) {
    if (descriptor.key === undefined) descriptor.missingIndex = ++missingIndex;
  }

  const labelCounts = new Map<string, number>();
  for (const descriptor of ordered) labelCounts.set(descriptor.label, (labelCounts.get(descriptor.label) ?? 0) + 1);
  const usedColumns = new Set(topKeys);
  const topKeySet = new Set(topKeys);
  for (const descriptor of ordered) {
    const collides = topKeySet.has(descriptor.label) || (labelCounts.get(descriptor.label) ?? 0) > 1;
    const base = collides
      ? descriptor.key !== undefined
        ? `${descriptor.label} [${descriptor.key}]`
        : `${descriptor.label} [#${descriptor.missingIndex}]`
      : descriptor.label;
    descriptor.column = uniqueColumn(base, usedColumns);
    usedColumns.add(descriptor.column);
  }
  return { topKeys, descriptors: ordered };
}

function fieldLabel(field: JsonRecord): string {
  for (const key of ["name", "title", "key"] as const) {
    const value = field[key];
    if (typeof value === "string" && value !== "") return value;
  }
  return "";
}

function uniqueColumn(base: string, used: Set<string>): string {
  if (!used.has(base)) return base;
  for (let index = 1; ; index++) {
    const candidate = `${base} [#${index}]`;
    if (!used.has(candidate)) return candidate;
  }
}

function formatCell(value: unknown, safety: CsvSafety): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return safety === "spreadsheet" ? protectSpreadsheetString(value) : value;
  if (typeof value === "number") return Number.isFinite(value) ? canonicalJson(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return canonicalJson(value);
}

function protectSpreadsheetString(value: string): string {
  if (value === "") return value;
  if (value[0] === "\t" || value[0] === "\r" || value[0] === "\n") return `'${value}`;
  const first = value.replace(/^[ \t]+/, "")[0];
  return first === "=" || first === "+" || first === "-" || first === "@" ? `'${value}` : value;
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return JSON.stringify(Number.isFinite(value) ? value : null);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry === undefined ? null : entry)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as JsonRecord;
    const entries = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort(compareText)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${entries.join(",")}}`;
  }
  return "null";
}

function quoteCsv(value: string): string {
  return /[",\r\n]/.test(value) || /^\s/u.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
