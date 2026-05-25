# ListBoardsResponse

## Example Usage

```typescript
import { ListBoardsResponse } from "plaky115/models/operations";

let value: ListBoardsResponse = {
  result: {
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
  },
};
```

## Fields

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `result`                                                                                             | [models.PublicPagedResponseV1BoardResponse](../../models/public-paged-response-v1-board-response.md) | :heavy_check_mark:                                                                                   | N/A                                                                                                  |