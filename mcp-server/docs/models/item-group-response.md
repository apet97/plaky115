# ItemGroupResponse

Represents item group response.

## Example Usage

```typescript
import { ItemGroupResponse } from "plaky115-mcp/models";

let value: ItemGroupResponse = {};
```

## Fields

| Field                                                                                  | Type                                                                                   | Required                                                                               | Description                                                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `id`                                                                                   | *number*                                                                               | :heavy_minus_sign:                                                                     | Represents unique item group identifier across the system.                             |
| `title`                                                                                | *string*                                                                               | :heavy_minus_sign:                                                                     | Represents title of the item group.                                                    |
| `color`                                                                                | *string*                                                                               | :heavy_minus_sign:                                                                     | Represents color of the item group. Color value is in standard RGB hexadecimal format. |
| `ranking`                                                                              | *string*                                                                               | :heavy_minus_sign:                                                                     | Represents lexicographical string used for custom ordering/sorting.                    |