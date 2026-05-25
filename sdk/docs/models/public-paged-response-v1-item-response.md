# PublicPagedResponseV1ItemResponse

## Example Usage

```typescript
import { PublicPagedResponseV1ItemResponse } from "plaky115/models";

let value: PublicPagedResponseV1ItemResponse = {
  data: [
    {
      board: 395217,
      space: 233611,
      parent: 130532,
      fields: [
        {
          key: "status-1",
        },
      ],
      subitems: [
        {
          board: {
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
          space: {
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
          parent: 979932,
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