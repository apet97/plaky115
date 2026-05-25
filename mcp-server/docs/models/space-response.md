# SpaceResponse

Represents space response.

## Example Usage

```typescript
import { SpaceResponse } from "plaky115-mcp/models";

let value: SpaceResponse = {
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
};
```

## Fields

| Field                                                        | Type                                                         | Required                                                     | Description                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `id`                                                         | *number*                                                     | :heavy_minus_sign:                                           | Represents unique identifier of the space.                   |
| `title`                                                      | *string*                                                     | :heavy_minus_sign:                                           | Represents title of the space.                               |
| `description`                                                | *string*                                                     | :heavy_minus_sign:                                           | Represents description of the space.                         |
| `defaultSpace`                                               | *boolean*                                                    | :heavy_minus_sign:                                           | Indicates whether the space is the default one.              |
| `kind`                                                       | [models.SpaceResponseKind](../models/space-response-kind.md) | :heavy_minus_sign:                                           | Represent kind of the space.                                 |
| `iconUrl`                                                    | *string*                                                     | :heavy_minus_sign:                                           | Represents url of the space icon.                            |
| `boards`                                                     | [models.BoardResponse](../models/board-response.md)[]        | :heavy_minus_sign:                                           | N/A                                                          |