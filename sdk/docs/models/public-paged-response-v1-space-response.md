# PublicPagedResponseV1SpaceResponse

## Example Usage

```typescript
import { PublicPagedResponseV1SpaceResponse } from "plaky115/models";

let value: PublicPagedResponseV1SpaceResponse = {
  data: [
    {
      boards: [
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
    },
  ],
};
```

## Fields

| Field                                                              | Type                                                               | Required                                                           | Description                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `data`                                                             | [models.SpaceResponse](../models/space-response.md)[]              | :heavy_minus_sign:                                                 | The list of elements returned for the current page.                |
| `hasMore`                                                          | *boolean*                                                          | :heavy_minus_sign:                                                 | Whether there are more elements available beyond this current set. |