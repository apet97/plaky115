# GetBoardByIdRequest

## Example Usage

```typescript
import { GetBoardByIdRequest } from "plaky115-mcp/models/operations";

let value: GetBoardByIdRequest = {
  spaceId: 1,
  boardId: 1,
};
```

## Fields

| Field                                                 | Type                                                  | Required                                              | Description                                           | Example                                               |
| ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `spaceId`                                             | *number*                                              | :heavy_check_mark:                                    | Represents unique space identifier across the system. | 1                                                     |
| `boardId`                                             | *number*                                              | :heavy_check_mark:                                    | Represents unique board identifier across the system. | 1                                                     |