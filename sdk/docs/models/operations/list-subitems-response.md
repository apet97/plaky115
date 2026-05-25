# ListSubitemsResponse

## Example Usage

```typescript
import { ListSubitemsResponse } from "plaky115/models/operations";

let value: ListSubitemsResponse = {
  result: {
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
  },
};
```

## Fields

| Field                                                                                              | Type                                                                                               | Required                                                                                           | Description                                                                                        |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `result`                                                                                           | [models.PublicPagedResponseV1ItemResponse](../../models/public-paged-response-v1-item-response.md) | :heavy_check_mark:                                                                                 | N/A                                                                                                |