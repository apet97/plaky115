# Plaky115 Surfaces

The toolkit ships three independent surfaces with a shared OpenAPI-backed
contract and separate user-facing runtimes.

## Architecture

```
                     openapi/plaky115-dx.openapi.yaml
                                    |
                                    v
                    openapi/plaky115-operation-metadata.json
                                    |
       +----------------------------+----------------------------+
       |                            |                            |
       v                            v                            v
   TS SDK                       Go CLI                       MCP Server
       |                            |                            |
   src/generated/types.ts      cli/internal/plakysdk/        mcp-server/src/runtime/
   (openapi-typescript)        operations.go (generated)     docs-index.ts (generated)
       |                            |                            |
   src/client/*                cli/internal/cli/raw/         mcp-server/src/tools/raw/
   src/runtime/*               *.go (generated)              *.ts (generated)
   (hand-written)                   |                            |
                                    v                            v
                              cli/internal/cli/dx.go        mcp-server/src/tools/curated/
                              cli/internal/plakydx/         (curated workflows)
                              (curated workflows)
```

## Layers

1. **Generated schema types** - produced by `openapi-typescript` from the overlay. These are pure TypeScript types and have zero runtime weight.
2. **Generated raw CLI and MCP surfaces** - one Go raw command/helper and one MCP raw tool per OpenAPI operation. These are deterministic outputs from local scripts.
3. **Hand-written SDK and curated surfaces** - resource-oriented `PlakyClient`, curated cobra commands, and curated MCP tools. This layer owns pagination iterators, retries, timeouts, cancellation, idempotency, typed errors, rate-limit budget, interceptors, webhook helpers, mutation planning, and workflow composition.

## SDK Boundary

The TypeScript SDK generates schema types only. It does not expose generated
operation modules as a user-facing SDK surface.

Use:

```ts
import { PlakyClient } from "plaky115";

const client = new PlakyClient({ apiKey: process.env.PLAKY115_API_KEY! });
const spaces = await client.spaces.list();
```

For low-level calls, use:

```ts
const response = await client.requestWithResponse({
  method: "GET",
  path: "/v1/public/spaces",
});
```

## Surface Status

Run `npm run status:surfaces` to print the current state of each surface. Pass
`--strict` to treat any `legacy` surface as drift. The SDK status should report
`schema-types-only` for operations.

## Why These Layers

- **Generated schema types** keep the SDK aligned with the API contract without making callers use path strings or OpenAPI response unions.
- **Generated raw CLI and MCP surfaces** keep operational tools mechanically aligned with the API.
- **Hand-written SDK resources** are what application developers touch: stable names, typed errors, retries, pagination, request metadata, and per-request overrides.

Generated files carry an `AUTO-GENERATED` header. Hand-written files live next
to generated surfaces, never inside them.
