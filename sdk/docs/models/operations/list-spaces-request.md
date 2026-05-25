# ListSpacesRequest

## Example Usage

```typescript
import { ListSpacesRequest } from "plaky115/models/operations";

let value: ListSpacesRequest = {
  expand: [
    "board",
  ],
};
```

## Fields

| Field                                                                          | Type                                                                           | Required                                                                       | Description                                                                    | Example                                                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `expand`                                                                       | [operations.ListSpacesExpand](../../models/operations/list-spaces-expand.md)[] | :heavy_minus_sign:                                                             | Comma-separated list of relationships to be expanded into full objects.        | board                                                                          |
| `page`                                                                         | *number*                                                                       | :heavy_minus_sign:                                                             | Page number.                                                                   |                                                                                |
| `pageSize`                                                                     | *number*                                                                       | :heavy_minus_sign:                                                             | Page size.                                                                     |                                                                                |