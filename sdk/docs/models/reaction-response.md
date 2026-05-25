# ReactionResponse

Represents detailed comment reaction response.

## Example Usage

```typescript
import { ReactionResponse } from "plaky115/models";

let value: ReactionResponse = {};
```

## Fields

| Field                                                                                             | Type                                                                                              | Required                                                                                          | Description                                                                                       |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `reactionCode`                                                                                    | *string*                                                                                          | :heavy_minus_sign:                                                                                | Represents the string code of the emoji. For example, for thumbs up emoji, we have "1f44d" code.<br/> |
| `reactedUsers`                                                                                    | [models.ReactionDetails](../models/reaction-details.md)[]                                         | :heavy_minus_sign:                                                                                | Represents a list of users who left the comment reaction.                                         |