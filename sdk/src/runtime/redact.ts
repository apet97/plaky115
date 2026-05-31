const SECRET = /plk_[A-Za-z0-9_-]+/g;

export function redact(value: string): string {
  return value.replace(SECRET, "plk_***");
}

export function redactRecord<T>(value: T): T {
  return JSON.parse(redact(JSON.stringify(value))) as T;
}
