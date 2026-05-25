# CommentRequest

Represents item comment request.

## Example Usage

```typescript
import { CommentRequest } from "plaky115-mcp/models";

let value: CommentRequest = {
  text: "My comment.",
  repliesToId: 1,
};
```

## Fields

| Field                              | Type                               | Required                           | Description                        | Example                            |
| ---------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------- |
| `text`                             | *string*                           | :heavy_check_mark:                 | Represents text of the comment.    | My comment.                        |
| `repliesToId`                      | *number*                           | :heavy_minus_sign:                 | Represents comment ID to reply to. | 1                                  |