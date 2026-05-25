# GetItemByIdRequest

## Example Usage

```typescript
import { GetItemByIdRequest } from "plaky115-mcp/models/operations";

let value: GetItemByIdRequest = {
  spaceId: 1,
  boardId: 1,
  itemId: 1,
  expand: [
    "space",
  ],
};
```

## Fields

| Field                                                                              | Type                                                                               | Required                                                                           | Description                                                                        | Example                                                                            |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `spaceId`                                                                          | *number*                                                                           | :heavy_check_mark:                                                                 | Represents unique space identifier across the system.                              | 1                                                                                  |
| `boardId`                                                                          | *number*                                                                           | :heavy_check_mark:                                                                 | Represents unique board identifier across the system.                              | 1                                                                                  |
| `itemId`                                                                           | *number*                                                                           | :heavy_check_mark:                                                                 | Represents unique item identifier across the system.                               | 1                                                                                  |
| `expand`                                                                           | [operations.GetItemByIdExpand](../../models/operations/get-item-by-id-expand.md)[] | :heavy_minus_sign:                                                                 | Comma-separated list of relationships to expand into full objects<br/>instead of IDs. | space,board                                                                        |