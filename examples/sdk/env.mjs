// Shared env helpers for the SDK examples. Never prints secret values.
export function requireApiKey() {
  const apiKey = process.env.PLAKY115_API_KEY ?? process.env.PLAKY115_API_KEY_AUTH;
  if (!apiKey) {
    console.error("Set PLAKY115_API_KEY before running this example.");
    process.exit(1);
  }
  return apiKey;
}

export function clientOptions() {
  const opts = { apiKey: requireApiKey() };
  // Real workspaces are account-prefixed; honor PLAKY115_BASE_URL when set.
  if (process.env.PLAKY115_BASE_URL) opts.serverURL = process.env.PLAKY115_BASE_URL;
  return opts;
}

export function requireIds(...names) {
  const out = {};
  for (const name of names) {
    const value = process.env[name];
    if (!value) {
      console.error(`Set ${name} before running this example.`);
      process.exit(1);
    }
    out[name] = value;
  }
  return out;
}
