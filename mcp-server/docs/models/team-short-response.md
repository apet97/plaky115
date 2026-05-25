# TeamShortResponse

Represents team response.

## Example Usage

```typescript
import { TeamShortResponse } from "plaky115-mcp/models";

let value: TeamShortResponse = {};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `id`                                                                                 | *number*                                                                             | :heavy_minus_sign:                                                                   | Represents unique team identifier across the system.                                 |
| `title`                                                                              | *string*                                                                             | :heavy_minus_sign:                                                                   | Represents title of the team.                                                        |
| `allUsersTeam`                                                                       | *boolean*                                                                            | :heavy_minus_sign:                                                                   | Indicates if the team is all users team (all workspace users are part of this team). |