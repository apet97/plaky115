// Read Item Groups and files, with explicit opt-in lifecycle probes for a
// sacrificial board/item. Upload content stays in memory and signed URLs are
// never printed or followed.
import { PlakyClient } from "plaky115";
import { clientOptions, requireIds } from "./env.mjs";

const { PLAKY115_SPACE_ID: spaceId, PLAKY115_BOARD_ID: boardId } = requireIds(
  "PLAKY115_SPACE_ID",
  "PLAKY115_BOARD_ID",
);
const client = new PlakyClient(clientOptions());

const groups = await client.itemGroups.list({ spaceId, boardId, pageSize: 100 });
console.log("item groups on first page:", groups.data?.length ?? 0);

if (process.env.MUTATE_GROUPS === "1") {
  const title = `plaky115 example group ${Date.now()}`;
  const created = await client.itemGroups.create({ spaceId, boardId, body: { title, color: "#123456" } });
  if (created.id === undefined) throw new Error("created group has no id");
  try {
    const current = await client.itemGroups.get({ spaceId, boardId, itemGroupId: created.id });
    await client.itemGroups.update({
      spaceId,
      boardId,
      itemGroupId: created.id,
      body: {
        title: `${title} updated`,
        ranking: current.ranking ?? "0|hzzzzz:",
        ...(current.color !== undefined ? { color: current.color } : {}),
      },
    });
    console.log("group lifecycle id:", created.id);
  } finally {
    await client.itemGroups.delete({ spaceId, boardId, itemGroupId: created.id });
  }
}

const itemId = process.env.PLAKY115_ITEM_ID;
if (itemId) {
  const files = await client.itemFiles.list({ spaceId, boardId, itemId });
  console.log("item files:", files.length);

  if (process.env.MUTATE_FILES === "1") {
    const name = `plaky115-example-${Date.now()}.txt`;
    const uploaded = await client.itemFiles.upload({
      spaceId,
      boardId,
      itemId,
      file: new Blob(["plaky115 in-memory example"], { type: "text/plain" }),
      fileName: name,
    });
    if (uploaded.id === undefined) throw new Error("uploaded file has no id");
    try {
      await client.itemFiles.get({ spaceId, boardId, itemId, itemFileId: uploaded.id });
      const download = await client.itemFiles.getDownload({ spaceId, boardId, itemId, itemFileId: uploaded.id });
      console.log("download metadata:", {
        urlPresent: typeof download.url === "string" && download.url.length > 0,
        expiresInSeconds: download.expiresInSeconds,
      });
      await client.itemFiles.update({
        spaceId,
        boardId,
        itemId,
        itemFileId: uploaded.id,
        body: { name: `updated-${name}`, description: "plaky115 example attachment" },
      });
    } finally {
      await client.itemFiles.delete({ spaceId, boardId, itemId, itemFileId: uploaded.id });
    }
  }
} else {
  console.log("set PLAKY115_ITEM_ID to exercise item-file reads");
}
