# ChangeItemAttributeValuesRequest

## Example Usage

```typescript
import { ChangeItemAttributeValuesRequest } from "plaky115-mcp/models/operations";

let value: ChangeItemAttributeValuesRequest = {
  spaceId: 1,
  boardId: 1,
  itemId: 1,
  body:
    "{\"Status\":\"To do\",\"number-1\":50,\"Description\":\"Updated description\"}",
};
```

## Fields

| Field                                                                       | Type                                                                        | Required                                                                    | Description                                                                 | Example                                                                     |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `spaceId`                                                                   | *number*                                                                    | :heavy_check_mark:                                                          | Represents unique space identifier across the system.                       | 1                                                                           |
| `boardId`                                                                   | *number*                                                                    | :heavy_check_mark:                                                          | Represents unique board identifier across the system.                       | 1                                                                           |
| `itemId`                                                                    | *number*                                                                    | :heavy_check_mark:                                                          | Represents unique item identifier across the system.                        | 1                                                                           |
| `body`                                                                      | *string*                                                                    | :heavy_check_mark:                                                          | Represents item field values to be changed.                                 | {<br/>"Status": "To do",<br/>"number-1": 50,<br/>"Description": "Updated description"<br/>} |