# ListBoardsRequest

## Example Usage

```typescript
import { ListBoardsRequest } from "plaky115/models/operations";

let value: ListBoardsRequest = {
  spaceId: 1,
};
```

## Fields

| Field                                                 | Type                                                  | Required                                              | Description                                           | Example                                               |
| ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `spaceId`                                             | *number*                                              | :heavy_check_mark:                                    | Represents unique space identifier across the system. | 1                                                     |
| `page`                                                | *number*                                              | :heavy_minus_sign:                                    | Page number.                                          |                                                       |
| `pageSize`                                            | *number*                                              | :heavy_minus_sign:                                    | Page size.                                            |                                                       |