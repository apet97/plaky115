# ReactionDetails

Represents user reaction details.

## Example Usage

```typescript
import { ReactionDetails } from "plaky115-mcp/models";

let value: ReactionDetails = {};
```

## Fields

| Field                                                                                         | Type                                                                                          | Required                                                                                      | Description                                                                                   |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `userId`                                                                                      | *number*                                                                                      | :heavy_minus_sign:                                                                            | Represents unique user identifier accross the system.                                         |
| `reactedAt`                                                                                   | [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) | :heavy_minus_sign:                                                                            | Represents date and time of the comment reaction creation (UTC) in ISO-8601 format.           |