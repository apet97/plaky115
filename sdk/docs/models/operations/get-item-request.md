# GetItemRequest

## Example Usage

```typescript
import { GetItemRequest } from "plaky115/models/operations";

let value: GetItemRequest = {
  spaceId: 1,
  boardId: 1,
  itemId: 1,
  expand: [
    "board",
  ],
};
```

## Fields

| Field                                                                             | Type                                                                              | Required                                                                          | Description                                                                       | Example                                                                           |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `spaceId`                                                                         | *number*                                                                          | :heavy_check_mark:                                                                | Represents unique space identifier across the system.                             | 1                                                                                 |
| `boardId`                                                                         | *number*                                                                          | :heavy_check_mark:                                                                | Represents unique board identifier across the system.                             | 1                                                                                 |
| `itemId`                                                                          | *number*                                                                          | :heavy_check_mark:                                                                | Represents unique item identifier across the system.                              | 1                                                                                 |
| `expand`                                                                          | [operations.GetItemExpand](../../models/operations/get-item-expand.md)[]          | :heavy_minus_sign:                                                                | Comma-separated list of relationships to expand into full objects<br/>instead of IDs. | space,board                                                                       |