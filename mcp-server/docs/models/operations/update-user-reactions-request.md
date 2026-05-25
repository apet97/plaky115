# UpdateUserReactionsRequest

## Example Usage

```typescript
import { UpdateUserReactionsRequest } from "plaky115-mcp/models/operations";

let value: UpdateUserReactionsRequest = {
  spaceId: 1,
  boardId: 1,
  itemId: 1,
  itemCommentId: 1,
  body: {
    reactions: [
      {
        value: "1f44d",
      },
    ],
  },
};
```

## Fields

| Field                                                             | Type                                                              | Required                                                          | Description                                                       | Example                                                           |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `spaceId`                                                         | *number*                                                          | :heavy_check_mark:                                                | Represents unique space identifier across the system.             | 1                                                                 |
| `boardId`                                                         | *number*                                                          | :heavy_check_mark:                                                | Represents unique board identifier across the system.             | 1                                                                 |
| `itemId`                                                          | *number*                                                          | :heavy_check_mark:                                                | Represents unique item identifier across the system.              | 1                                                                 |
| `itemCommentId`                                                   | *number*                                                          | :heavy_check_mark:                                                | Represents unique item comment identifier across the system.      | 1                                                                 |
| `body`                                                            | [models.ReactionPutRequest](../../models/reaction-put-request.md) | :heavy_check_mark:                                                | N/A                                                               |                                                                   |