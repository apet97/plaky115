import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pkgUrl = new URL("../../package.json", import.meta.url);
const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), "utf8")) as { version: string };

export function buildUserAgent(suffix?: string): string {
  return `plaky115/${pkg.version} node/${process.version}${suffix ? ` ${suffix}` : ""}`;
}
