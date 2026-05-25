# DeleteItemCommentRequest

## Example Usage

```typescript
import { DeleteItemCommentRequest } from "plaky115/models/operations";

let value: DeleteItemCommentRequest = {
  spaceId: 1,
  boardId: 1,
  itemId: 1,
  itemCommentId: 1,
};
```

## Fields

| Field                                                        | Type                                                         | Required                                                     | Description                                                  | Example                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `spaceId`                                                    | *number*                                                     | :heavy_check_mark:                                           | Represents unique space identifier across the system.        | 1                                                            |
| `boardId`                                                    | *number*                                                     | :heavy_check_mark:                                           | Represents unique board identifier across the system.        | 1                                                            |
| `itemId`                                                     | *number*                                                     | :heavy_check_mark:                                           | Represents unique item identifier across the system.         | 1                                                            |
| `itemCommentId`                                              | *number*                                                     | :heavy_check_mark:                                           | Represents unique item comment identifier across the system. | 1                                                            |