// Build typed field values and create an item. Creates sacrificial data: run it
// against a smoke board. Use dryRun to preview the payload without writing.
import { PlakyClient, fieldValues, statusField, stringField } from "plaky115";
import { clientOptions, requireIds } from "./env.mjs";

const { PLAKY115_SPACE_ID: spaceId, PLAKY115_BOARD_ID: boardId } = requireIds(
  "PLAKY115_SPACE_ID",
  "PLAKY115_BOARD_ID",
);

const client = new PlakyClient(clientOptions());

const body = {
  title: "smoke: example item",
  fields: fieldValues({
    Status: statusField("Done"),
    Notes: stringField("created by examples/sdk/03-fields-and-create.mjs"),
  }),
};

// Preview without writing:
const plan = await client.items.create({ spaceId, boardId, body, dryRun: true });
console.log("dry-run plan:", JSON.stringify(plan, null, 2));

// Set CREATE=1 to actually create the item.
if (process.env.CREATE === "1") {
  const created = await client.items.create({ spaceId, boardId, body });
  console.log("created item id:", created.id);
}
