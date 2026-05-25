# UserResponse

Represents short user response.

## Example Usage

```typescript
import { UserResponse } from "plaky115/models";

let value: UserResponse = {};
```

## Fields

| Field                                                      | Type                                                       | Required                                                   | Description                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `id`                                                       | *number*                                                   | :heavy_minus_sign:                                         | Represents unique user identifier across the system.       |
| `email`                                                    | *string*                                                   | :heavy_minus_sign:                                         | Represents user's email.                                   |
| `name`                                                     | *string*                                                   | :heavy_minus_sign:                                         | Represents user's name.                                    |
| `type`                                                     | [models.UserResponseType](../models/user-response-type.md) | :heavy_minus_sign:                                         | Represents type of the user.                               |
| `status`                                                   | [models.Status](../models/status.md)                       | :heavy_minus_sign:                                         | Represents status of the user                              |
| `details`                                                  | [models.UserDetails](../models/user-details.md)            | :heavy_minus_sign:                                         | Represents user details.                                   |
| `photoUrl`                                                 | *string*                                                   | :heavy_minus_sign:                                         | Represents url of the user profile photo                   |