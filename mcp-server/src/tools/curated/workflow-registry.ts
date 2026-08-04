export type WorkflowScope = "read" | "write" | "destructive";

export type WorkflowSchemaKey =
  | "workspaceMap"
  | "itemsSearch"
  | "commentsThread"
  | "exportItems"
  | "itemsCreate"
  | "itemsUpdateFields"
  | "commentsAdd"
  | "itemGroupsCreate"
  | "itemGroupsUpdate"
  | "itemFilesUpload"
  | "itemFilesUpdate";

export type WorkflowDefinition = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly scopes: readonly WorkflowScope[];
  readonly mutation: boolean;
  readonly destructive: boolean;
  readonly openWorld: boolean;
  readonly schemaKey: WorkflowSchemaKey;
  readonly docsText: string;
};

export const workflowRegistry = [
  {
    id: "workspace.map",
    title: "Map Plaky workspace",
    description: "Discover spaces and boards before calling item workflows.",
    scopes: ["read"],
    mutation: false,
    destructive: false,
    openWorld: true,
    schemaKey: "workspaceMap",
    docsText: "Returns a bounded compact workspace tree with space and board identifiers, titles, and counts.",
  },
  {
    id: "items.search",
    title: "Search Plaky items",
    description: "Search item titles and field values with exact continuation metadata.",
    scopes: ["read"],
    mutation: false,
    destructive: false,
    openWorld: true,
    schemaKey: "itemsSearch",
    docsText: "Scans a bounded item window and reports matches, completeness, and a resumable page/index cursor.",
  },
  {
    id: "comments.thread",
    title: "Read an item comment thread",
    description: "Read a bounded comment thread for one item.",
    scopes: ["read"],
    mutation: false,
    destructive: false,
    openWorld: true,
    schemaKey: "commentsThread",
    docsText: "Returns compact comment records for the selected item.",
  },
  {
    id: "export.items",
    title: "Export Plaky items",
    description: "Return one bounded JSONL or CSV item export chunk.",
    scopes: ["read"],
    mutation: false,
    destructive: false,
    openWorld: true,
    schemaKey: "exportItems",
    docsText: "Exports one bounded chunk with UTF-8 byte counts and an exact continuation cursor when more items remain.",
  },
  {
    id: "items.create",
    title: "Create a Plaky item",
    description: "Create an item after exact target and body validation; dry-run is the default.",
    scopes: ["read", "write"],
    mutation: true,
    destructive: false,
    openWorld: true,
    schemaKey: "itemsCreate",
    docsText: "Creates one item or returns a validated dry-run plan without writing.",
  },
  {
    id: "items.updateFields",
    title: "Update Plaky item fields",
    description: "Update field values on one or more items with durable per-item receipts.",
    scopes: ["read", "write"],
    mutation: true,
    destructive: false,
    openWorld: true,
    schemaKey: "itemsUpdateFields",
    docsText: "Updates item fields at most once per item and retains completed receipts on partial failure.",
  },
  {
    id: "comments.add",
    title: "Add a Plaky comment",
    description: "Append one comment after exact target and body validation; dry-run is the default.",
    scopes: ["read", "write"],
    mutation: true,
    destructive: false,
    openWorld: true,
    schemaKey: "commentsAdd",
    docsText: "Adds one comment or returns a validated dry-run plan without writing.",
  },
  {
    id: "itemGroups.create",
    title: "Create a Plaky item group",
    description: "Create an item group with required title and color; dry-run is the default.",
    scopes: ["read", "write"],
    mutation: true,
    destructive: false,
    openWorld: true,
    schemaKey: "itemGroupsCreate",
    docsText: "Creates one item group with local required-field validation.",
  },
  {
    id: "itemGroups.update",
    title: "Update a Plaky item group",
    description: "Update an item group with required title, ranking, and color; dry-run is the default.",
    scopes: ["read", "write"],
    mutation: true,
    destructive: false,
    openWorld: true,
    schemaKey: "itemGroupsUpdate",
    docsText: "Updates one item group only after all required fields are validated locally.",
  },
  {
    id: "itemFiles.upload",
    title: "Upload a Plaky item file",
    description: "Upload one canonical base64 file after bounded metadata and content validation; dry-run is the default.",
    scopes: ["read", "write"],
    mutation: true,
    destructive: false,
    openWorld: true,
    schemaKey: "itemFilesUpload",
    docsText: "Uploads one in-memory file; local paths are never accepted by the MCP surface.",
  },
  {
    id: "itemFiles.update",
    title: "Update a Plaky item file",
    description: "Update one item-file name or description after exact target validation; dry-run is the default.",
    scopes: ["read", "write"],
    mutation: true,
    destructive: false,
    openWorld: true,
    schemaKey: "itemFilesUpdate",
    docsText: "Updates one item-file record or returns a validated dry-run plan without writing.",
  },
] as const satisfies readonly WorkflowDefinition[];

export type WorkflowId = (typeof workflowRegistry)[number]["id"];

export function workflowDefinition(id: WorkflowId): WorkflowDefinition {
  const definition = workflowRegistry.find((candidate) => candidate.id === id);
  if (definition === undefined) throw new Error(`Unknown curated workflow ${id}`);
  return definition;
}
