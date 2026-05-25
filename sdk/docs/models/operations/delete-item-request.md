# DeleteItemRequest

## Example Usage

```typescript
import { DeleteItemRequest } from "plaky115/models/operations";

let value: DeleteItemRequest = {
  spaceId: 1,
  boardId: 1,
  itemId: 1,
};
```

## Fields

| Field                                                 | Type                                                  | Required                                              | Description                                           | Example                                               |
| ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `spaceId`                                             | *number*                                              | :heavy_check_mark:                                    | Represents unique space identifier across the system. | 1                                                     |
| `boardId`                                             | *number*                                              | :heavy_check_mark:                                    | Represents unique board identifier across the system. | 1                                                     |
| `itemId`                                              | *number*                                              | :heavy_check_mark:                                    | Represents unique item identifier across the system.  | 1                                                     |