# GetWorkspaceUsersRequest

## Example Usage

```typescript
import { GetWorkspaceUsersRequest } from "plaky115-mcp/models/operations";

let value: GetWorkspaceUsersRequest = {};
```

## Fields

| Field                                                                    | Type                                                                     | Required                                                                 | Description                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `emails`                                                                 | *string*[]                                                               | :heavy_minus_sign:                                                       | If provided, you will get list of users filtered for the provided emails |
| `status`                                                                 | [operations.Status](../../models/operations/status.md)                   | :heavy_minus_sign:                                                       | If provided, you will get list of users filtered for the provided status |
| `type`                                                                   | [operations.Type](../../models/operations/type.md)                       | :heavy_minus_sign:                                                       | If provided, you will get list of users filtered for the provided type   |
| `page`                                                                   | *number*                                                                 | :heavy_minus_sign:                                                       | Page number.                                                             |
| `pageSize`                                                               | *number*                                                                 | :heavy_minus_sign:                                                       | Page size.                                                               |