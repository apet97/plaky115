export type PathValue = string | number | boolean;

export function pathSegment(value: PathValue): string {
  return encodeURIComponent(String(value));
}
