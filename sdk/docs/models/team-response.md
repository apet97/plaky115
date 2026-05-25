# TeamResponse

Represents team response.

## Example Usage

```typescript
import { TeamResponse } from "plaky115/models";

let value: TeamResponse = {};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `id`                                                                                 | *number*                                                                             | :heavy_minus_sign:                                                                   | Represents unique team identifier across the system.                                 |
| `title`                                                                              | *string*                                                                             | :heavy_minus_sign:                                                                   | Represents title of the team.                                                        |
| `allUsersTeam`                                                                       | *boolean*                                                                            | :heavy_minus_sign:                                                                   | Indicates if the team is all users team (all workspace users are part of this team). |
| `iconUrl`                                                                            | *string*                                                                             | :heavy_minus_sign:                                                                   | Represents url of the team's icon.                                                   |
| `members`                                                                            | *number*[]                                                                           | :heavy_minus_sign:                                                                   | Represents the list of user ids which are members of the team                        |