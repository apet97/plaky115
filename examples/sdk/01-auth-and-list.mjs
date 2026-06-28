// Authenticate and list spaces. Verifies connectivity and the API key.
import { PlakyClient } from "plaky115";
import { clientOptions } from "./env.mjs";

const client = new PlakyClient(clientOptions());

const me = await client.users.me();
console.log("authenticated as:", me.id, me.name ?? me.email ?? "");

const spaces = await client.spaces.list({ pageSize: 25 });
for (const space of spaces.data ?? []) {
  console.log(space.id, space.title);
}
console.log("hasMore:", spaces.hasMore === true);
