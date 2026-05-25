# CreateItemCommentRequest

## Example Usage

```typescript
import { CreateItemCommentRequest } from "plaky115-mcp/models/operations";

let value: CreateItemCommentRequest = {
  spaceId: 1,
  boardId: 1,
  itemId: 1,
  body: {
    text: "My comment.",
    repliesToId: 1,
  },
};
```

## Fields

| Field                                                    | Type                                                     | Required                                                 | Description                                              | Example                                                  |
| -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| `spaceId`                                                | *number*                                                 | :heavy_check_mark:                                       | Represents unique space identifier across the system.    | 1                                                        |
| `boardId`                                                | *number*                                                 | :heavy_check_mark:                                       | Represents unique board identifier across the system.    | 1                                                        |
| `itemId`                                                 | *number*                                                 | :heavy_check_mark:                                       | Represents unique item identifier across the system.     | 1                                                        |
| `body`                                                   | [models.CommentRequest](../../models/comment-request.md) | :heavy_check_mark:                                       | N/A                                                      |                                                          |