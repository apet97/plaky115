# GetSpaceRequest

## Example Usage

```typescript
import { GetSpaceRequest } from "plaky115/models/operations";

let value: GetSpaceRequest = {
  spaceId: 1,
  expand: [
    "board",
  ],
};
```

## Fields

| Field                                                                      | Type                                                                       | Required                                                                   | Description                                                                | Example                                                                    |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `spaceId`                                                                  | *number*                                                                   | :heavy_check_mark:                                                         | Represents unique space identifier across the system.                      | 1                                                                          |
| `expand`                                                                   | [operations.GetSpaceExpand](../../models/operations/get-space-expand.md)[] | :heavy_minus_sign:                                                         | Comma-separated list of relationships to be expanded into full objects.    | board                                                                      |