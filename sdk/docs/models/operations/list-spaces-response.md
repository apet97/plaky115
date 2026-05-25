# ListSpacesResponse

## Example Usage

```typescript
import { ListSpacesResponse } from "plaky115/models/operations";

let value: ListSpacesResponse = {
  result: {
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
  },
};
```

## Fields

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `result`                                                                                             | [models.PublicPagedResponseV1SpaceResponse](../../models/public-paged-response-v1-space-response.md) | :heavy_check_mark:                                                                                   | N/A                                                                                                  |