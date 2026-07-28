export type PathValue = string | number | boolean;

const maximumInt64 = 9_223_372_036_854_775_807n;

export function pathSegment(value: PathValue): string {
  return encodeURIComponent(String(value));
}

export function idPathSegment(value: string | number): string {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError("ID numbers must be non-negative safe integers; use a decimal string for larger int64 IDs");
    }
    return String(value);
  }
  if (!/^(0|[1-9]\d*)$/.test(value) || BigInt(value) > maximumInt64) {
    throw new RangeError("IDs must be canonical non-negative signed int64 decimal strings");
  }
  return value;
}
