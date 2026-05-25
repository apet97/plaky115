# ReactionResponseNoCode

Represents item comment reaction response without reaction code.

## Example Usage

```typescript
import { ReactionResponseNoCode } from "plaky115/models";

let value: ReactionResponseNoCode = {};
```

## Fields

| Field                                                                                         | Type                                                                                          | Required                                                                                      | Description                                                                                   |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `createdById`                                                                                 | *number*                                                                                      | :heavy_minus_sign:                                                                            | Represents ID of the user who created the comment reaction.                                   |
| `createdAt`                                                                                   | [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) | :heavy_minus_sign:                                                                            | Represents date and time of the comment reaction creation (UTC) in ISO-8601 format.           |