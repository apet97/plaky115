# CommentResponse

Represents item comment response.

## Example Usage

```typescript
import { CommentResponse } from "plaky115-mcp/models";

let value: CommentResponse = {};
```

## Fields

| Field                                                                                         | Type                                                                                          | Required                                                                                      | Description                                                                                   |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `id`                                                                                          | *number*                                                                                      | :heavy_minus_sign:                                                                            | Represents unique item comment identifier across the system.                                  |
| `content`                                                                                     | *string*                                                                                      | :heavy_minus_sign:                                                                            | Represents content of the comment.                                                            |
| `deleted`                                                                                     | *boolean*                                                                                     | :heavy_minus_sign:                                                                            | Indicates whether the comment is softly deleted.                                              |
| `createdBy`                                                                                   | *number*                                                                                      | :heavy_minus_sign:                                                                            | Represents ID of the user who created the comment.                                            |
| `createdAt`                                                                                   | [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) | :heavy_minus_sign:                                                                            | Represents date and time of the comment creation (UTC) in ISO-8601 format.                    |
| `updatedAt`                                                                                   | [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) | :heavy_minus_sign:                                                                            | Represents date and time of the comment update (UTC) in ISO-8601 format.                      |
| `pinned`                                                                                      | *boolean*                                                                                     | :heavy_minus_sign:                                                                            | Indicates whether the comment is pinned.                                                      |
| `reactions`                                                                                   | [models.ReactionResponse](../models/reaction-response.md)[]                                   | :heavy_minus_sign:                                                                            | Represents reactions to the comment.                                                          |
| `replies`                                                                                     | [models.CommentResponse](../models/comment-response.md)[]                                     | :heavy_minus_sign:                                                                            | Represents replies to the comment.                                                            |