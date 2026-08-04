import { resolve } from "node:path";

export function parseGenerationOptions(argv, defaultRoot) {
  const options = {
    sourceRoot: resolve(defaultRoot),
    outputRoot: resolve(defaultRoot),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--source-root" || argument === "--output-root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a path`);
      const key = argument === "--source-root" ? "sourceRoot" : "outputRoot";
      options[key] = resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--help") {
      console.log("Usage: --source-root PATH --output-root PATH");
      process.exit(0);
    }
    throw new Error(`unknown generation option: ${argument}`);
  }

  return Object.freeze(options);
}

export function resolveGeneratedPath(root, relativePath) {
  return resolve(root, relativePath);
}

export function metadataPath(outputRoot) {
  return resolveGeneratedPath(outputRoot, "openapi/plaky115-operation-metadata.json");
}

export function isIsolatedGeneration(options) {
  return options.sourceRoot !== options.outputRoot;
}
