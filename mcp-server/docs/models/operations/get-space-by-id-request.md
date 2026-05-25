# GetSpaceByIdRequest

## Example Usage

```typescript
import { GetSpaceByIdRequest } from "plaky115-mcp/models/operations";

let value: GetSpaceByIdRequest = {
  spaceId: 1,
  expand: [
    "board",
  ],
};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          | Example                                                                              |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `spaceId`                                                                            | *number*                                                                             | :heavy_check_mark:                                                                   | Represents unique space identifier across the system.                                | 1                                                                                    |
| `expand`                                                                             | [operations.GetSpaceByIdExpand](../../models/operations/get-space-by-id-expand.md)[] | :heavy_minus_sign:                                                                   | Comma-separated list of relationships to be expanded into full objects.              | board                                                                                |