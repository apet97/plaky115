# GetSubitemsForItemRequest

## Example Usage

```typescript
import { GetSubitemsForItemRequest } from "plaky115-mcp/models/operations";

let value: GetSubitemsForItemRequest = {
  spaceId: 1,
  boardId: 1,
  itemId: 1,
  expand: [
    "board",
  ],
};
```

## Fields

| Field                                                                                            | Type                                                                                             | Required                                                                                         | Description                                                                                      | Example                                                                                          |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `spaceId`                                                                                        | *number*                                                                                         | :heavy_check_mark:                                                                               | Represents unique space identifier across the system.                                            | 1                                                                                                |
| `boardId`                                                                                        | *number*                                                                                         | :heavy_check_mark:                                                                               | Represents unique board identifier across the system.                                            | 1                                                                                                |
| `itemId`                                                                                         | *number*                                                                                         | :heavy_check_mark:                                                                               | Represents unique item identifier across the system.                                             | 1                                                                                                |
| `page`                                                                                           | *number*                                                                                         | :heavy_minus_sign:                                                                               | Page number.                                                                                     |                                                                                                  |
| `pageSize`                                                                                       | *number*                                                                                         | :heavy_minus_sign:                                                                               | Page size.                                                                                       |                                                                                                  |
| `expand`                                                                                         | [operations.GetSubitemsForItemExpand](../../models/operations/get-subitems-for-item-expand.md)[] | :heavy_minus_sign:                                                                               | Comma-separated list of relationships to expand into full objects<br/>instead of IDs.            | space,board                                                                                      |