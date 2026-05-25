# ReactionPutRequest

Represents request for adding/removing authenticated user's comment reaction(s).

## Example Usage

```typescript
import { ReactionPutRequest } from "plaky115-mcp/models";

let value: ReactionPutRequest = {
  reactions: [
    {
      value: "1f44d",
    },
  ],
};
```

## Fields

| Field                                                                                                             | Type                                                                                                              | Required                                                                                                          | Description                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `reactions`                                                                                                       | [models.Reaction](../models/reaction.md)[]                                                                        | :heavy_check_mark:                                                                                                | You can leave multiple reactions, it's overriding the current ones that you've left,<br/>leave empty to remove them.<br/> |