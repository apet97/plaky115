# PublicPagedResponseV1ItemResponse

## Example Usage

```typescript
import { PublicPagedResponseV1ItemResponse } from "plaky115-mcp/models";

let value: PublicPagedResponseV1ItemResponse = {
  data: [
    {
      board: 307014,
      space: 723145,
      parent: 682638,
      fields: [
        {
          key: "status-1",
        },
      ],
      subitems: [
        {
          board: 201715,
          space: 869479,
          parent: 855941,
          fields: [
            {
              key: "status-1",
            },
          ],
        },
      ],
    },
  ],
};
```

## Fields

| Field                                                              | Type                                                               | Required                                                           | Description                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `data`                                                             | [models.ItemResponse](../models/item-response.md)[]                | :heavy_minus_sign:                                                 | The list of elements returned for the current page.                |
| `hasMore`                                                          | *boolean*                                                          | :heavy_minus_sign:                                                 | Whether there are more elements available beyond this current set. |