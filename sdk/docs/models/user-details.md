# UserDetails

Represents user details.

## Example Usage

```typescript
import { UserDetails } from "plaky115/models";

let value: UserDetails = {};
```

## Fields

| Field                                             | Type                                              | Required                                          | Description                                       |
| ------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| `title`                                           | *string*                                          | :heavy_minus_sign:                                | Represents title of the user                      |
| `phone`                                           | *string*                                          | :heavy_minus_sign:                                | Represents phone number of the user               |
| `mobilePhone`                                     | *string*                                          | :heavy_minus_sign:                                | Represents mobile phone number of the user        |
| `location`                                        | *string*                                          | :heavy_minus_sign:                                | Represents location of the user                   |
| `birthDay`                                        | [Date](../types/rfcdate.md)                       | :heavy_minus_sign:                                | Represents status of the user                     |
| `workAnniversary`                                 | [Date](../types/rfcdate.md)                       | :heavy_minus_sign:                                | Represents status of the user                     |
| `customFields`                                    | [models.UserDetails](../models/user-details.md)[] | :heavy_minus_sign:                                | Represents list of custom fields of the user      |