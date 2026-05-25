# PublicPagedResponseV1UserResponse

## Example Usage

```typescript
import { PublicPagedResponseV1UserResponse } from "plaky115/models";

let value: PublicPagedResponseV1UserResponse = {};
```

## Fields

| Field                                                              | Type                                                               | Required                                                           | Description                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `data`                                                             | [models.UserResponse](../models/user-response.md)[]                | :heavy_minus_sign:                                                 | The list of elements returned for the current page.                |
| `hasMore`                                                          | *boolean*                                                          | :heavy_minus_sign:                                                 | Whether there are more elements available beyond this current set. |