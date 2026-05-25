# PublicPagedResponseV1TeamResponse

## Example Usage

```typescript
import { PublicPagedResponseV1TeamResponse } from "plaky115-mcp/models";

let value: PublicPagedResponseV1TeamResponse = {};
```

## Fields

| Field                                                              | Type                                                               | Required                                                           | Description                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `data`                                                             | [models.TeamResponse](../models/team-response.md)[]                | :heavy_minus_sign:                                                 | The list of elements returned for the current page.                |
| `hasMore`                                                          | *boolean*                                                          | :heavy_minus_sign:                                                 | Whether there are more elements available beyond this current set. |