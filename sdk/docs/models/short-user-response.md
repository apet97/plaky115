# ShortUserResponse

Represents short user response.

## Example Usage

```typescript
import { ShortUserResponse } from "plaky115/models";

let value: ShortUserResponse = {};
```

## Fields

| Field                                                                 | Type                                                                  | Required                                                              | Description                                                           |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `id`                                                                  | *number*                                                              | :heavy_minus_sign:                                                    | Represents unique user identifier across the system.                  |
| `email`                                                               | *string*                                                              | :heavy_minus_sign:                                                    | Represents user's email.                                              |
| `name`                                                                | *string*                                                              | :heavy_minus_sign:                                                    | Represents user's name.                                               |
| `type`                                                                | [models.ShortUserResponseType](../models/short-user-response-type.md) | :heavy_minus_sign:                                                    | Represents type of the user.                                          |