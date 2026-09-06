import { statSync } from "node:fs";
import { delimiter, join } from "node:path";

export function bunCommand(packageRoot) {
  const candidates = [
    join(packageRoot, "node_modules/bun/bin/bun.exe"),
    ...(process.env.PATH ?? "").split(delimiter).filter(Boolean)
      .map((directory) => join(directory, process.platform === "win32" ? "bun.exe" : "bun")),
  ];
  for (const candidate of candidates) {
    try {
      const file = statSync(candidate);
      if (file.isFile() && file.size > 0) return candidate;
    } catch { /* Continue to the next installed binary. */ }
  }
  return "bun";
}
