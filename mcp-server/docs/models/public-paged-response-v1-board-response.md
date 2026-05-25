# PublicPagedResponseV1BoardResponse

## Example Usage

```typescript
import { PublicPagedResponseV1BoardResponse } from "plaky115-mcp/models";

let value: PublicPagedResponseV1BoardResponse = {
  data: [
    {
      defaultValues: {
        defaultAttributes: {
          "status-1": "1",
          "tag-1": [
            "1",
            "2",
          ],
        },
      },
    },
  ],
};
```

## Fields

| Field                                                              | Type                                                               | Required                                                           | Description                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `data`                                                             | [models.BoardResponse](../models/board-response.md)[]              | :heavy_minus_sign:                                                 | The list of elements returned for the current page.                |
| `hasMore`                                                          | *boolean*                                                          | :heavy_minus_sign:                                                 | Whether there are more elements available beyond this current set. |