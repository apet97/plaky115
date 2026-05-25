# BoardResponse

Represents board response.

## Example Usage

```typescript
import { BoardResponse } from "plaky115/models";

let value: BoardResponse = {
  defaultValues: {
    defaultAttributes: {
      "status-1": "1",
      "tag-1": [
        "1",
        "2",
      ],
    },
  },
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                                                                                           | *number*                                                                                       | :heavy_minus_sign:                                                                             | Represents unique identifier of the board.                                                     |
| `title`                                                                                        | *string*                                                                                       | :heavy_minus_sign:                                                                             | Represents title of the board.                                                                 |
| `description`                                                                                  | *string*                                                                                       | :heavy_minus_sign:                                                                             | Represents description of the board.                                                           |
| `defaultBoard`                                                                                 | *boolean*                                                                                      | :heavy_minus_sign:                                                                             | Indicates if the board is default.                                                             |
| `template`                                                                                     | *boolean*                                                                                      | :heavy_minus_sign:                                                                             | If true, it means the board serves as a template for generating other production-ready boards. |
| `ranking`                                                                                      | *string*                                                                                       | :heavy_minus_sign:                                                                             | Represents lexicographical string used for the board ordering.                                 |
| `kind`                                                                                         | [models.BoardResponseKind](../models/board-response-kind.md)                                   | :heavy_minus_sign:                                                                             | Represents type of the board.                                                                  |
| `editPermissionsMode`                                                                          | [models.EditPermissionsMode](../models/edit-permissions-mode.md)                               | :heavy_minus_sign:                                                                             | Represents permission modes for the board edit actions.                                        |
| `folder`                                                                                       | *models.Folder*                                                                                | :heavy_minus_sign:                                                                             | Represents folder containing the board. Can be returned as an ID or a full object if expanded. |
| `space`                                                                                        | *models.BoardResponseSpace*                                                                    | :heavy_minus_sign:                                                                             | Represents space containing the board. Can be returned as an ID or a full object if expanded.  |
| `defaultValues`                                                                                | [models.BoardDefaultValues](../models/board-default-values.md)                                 | :heavy_minus_sign:                                                                             | N/A                                                                                            |
| `fields`                                                                                       | [models.ItemAttributeDefinition](../models/item-attribute-definition.md)[]                     | :heavy_minus_sign:                                                                             | N/A                                                                                            |
| `groups`                                                                                       | [models.ItemGroupResponse](../models/item-group-response.md)[]                                 | :heavy_minus_sign:                                                                             | N/A                                                                                            |