# UpdateItemFieldRequest

## Example Usage

```typescript
import { UpdateItemFieldRequest } from "plaky115/models/operations";

let value: UpdateItemFieldRequest = {
  spaceId: 1,
  boardId: 1,
  itemId: 1,
  itemFieldKey: "<value>",
  body: {
    value: {
      "value": "To do",
    },
  },
};
```

## Fields

| Field                                                                        | Type                                                                         | Required                                                                     | Description                                                                  | Example                                                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `spaceId`                                                                    | *number*                                                                     | :heavy_check_mark:                                                           | Represents unique space identifier across the system.                        | 1                                                                            |
| `boardId`                                                                    | *number*                                                                     | :heavy_check_mark:                                                           | Represents unique board identifier across the system.                        | 1                                                                            |
| `itemId`                                                                     | *number*                                                                     | :heavy_check_mark:                                                           | Represents unique item identifier across the system.                         | 1                                                                            |
| `itemFieldKey`                                                               | *string*                                                                     | :heavy_check_mark:                                                           | Represents key of the field.                                                 |                                                                              |
| `body`                                                                       | [models.FieldValueChangeRequest](../../models/field-value-change-request.md) | :heavy_check_mark:                                                           | N/A                                                                          |                                                                              |