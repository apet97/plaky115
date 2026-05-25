export type FieldValues = Record<string, unknown>;

export function fieldValues<T extends FieldValues>(values: T): T {
  return values;
}

export function omitUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
