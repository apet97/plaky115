# CreateItemRequest

## Example Usage

```typescript
import { CreateItemRequest } from "plaky115-mcp/models/operations";

let value: CreateItemRequest = {
  spaceId: 1,
  boardId: 1,
  body: {
    title: "My New Item",
    parentId: 1,
    groupId: 1,
    groupTitle: "Backlog",
    fields: {
      "Status": "To do",
      "number-1": 50,
      "Description": "Test description",
    },
  },
};
```

## Fields

| Field                                                           | Type                                                            | Required                                                        | Description                                                     | Example                                                         |
| --------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| `spaceId`                                                       | *number*                                                        | :heavy_check_mark:                                              | Represents unique space identifier across the system.           | 1                                                               |
| `boardId`                                                       | *number*                                                        | :heavy_check_mark:                                              | Represents unique board identifier across the system.           | 1                                                               |
| `body`                                                          | [models.ItemCreateRequest](../../models/item-create-request.md) | :heavy_check_mark:                                              | N/A                                                             |                                                                 |