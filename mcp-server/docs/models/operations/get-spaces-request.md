# GetSpacesRequest

## Example Usage

```typescript
import { GetSpacesRequest } from "plaky115-mcp/models/operations";

let value: GetSpacesRequest = {
  expand: [
    "board",
  ],
};
```

## Fields

| Field                                                                        | Type                                                                         | Required                                                                     | Description                                                                  | Example                                                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `expand`                                                                     | [operations.GetSpacesExpand](../../models/operations/get-spaces-expand.md)[] | :heavy_minus_sign:                                                           | Comma-separated list of relationships to be expanded into full objects.      | board                                                                        |
| `page`                                                                       | *number*                                                                     | :heavy_minus_sign:                                                           | Page number.                                                                 |                                                                              |
| `pageSize`                                                                   | *number*                                                                     | :heavy_minus_sign:                                                           | Page size.                                                                   |                                                                              |