// Iterate items lazily across pages. `limit` is a client-side cap, not a server
// parameter (the API is strictly page-based). See docs/api-behavior.md.
import { PlakyClient } from "plaky115";
import { clientOptions, requireIds } from "./env.mjs";

const { PLAKY115_SPACE_ID: spaceId, PLAKY115_BOARD_ID: boardId } = requireIds(
  "PLAKY115_SPACE_ID",
  "PLAKY115_BOARD_ID",
);

const client = new PlakyClient(clientOptions());

let count = 0;
for await (const item of client.items.iterate({ spaceId, boardId, pageSize: 50, limit: 200 })) {
  count += 1;
  if (count <= 10) console.log(item.id, item.title);
}
console.log("items seen (client-side cap 200):", count);

// firstPage()/toArray() helpers are also available:
const firstPage = await client.items.iterate({ spaceId, boardId, pageSize: 50 }).firstPage();
console.log("first page size:", firstPage.data.length, "hasMore:", firstPage.hasMore);
