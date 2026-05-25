# StatusLabelDefinition

## Example Usage

```typescript
import { StatusLabelDefinition } from "plaky115/models";

let value: StatusLabelDefinition = {};
```

## Fields

| Field                                                                    | Type                                                                     | Required                                                                 | Description                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `key`                                                                    | *string*                                                                 | :heavy_minus_sign:                                                       | Represents the unique identifier/key for the status label.               |
| `title`                                                                  | *string*                                                                 | :heavy_minus_sign:                                                       | Represents the display title of the status.                              |
| `color`                                                                  | *string*                                                                 | :heavy_minus_sign:                                                       | Represents the hexadecimal color code representing the status.           |
| `isFinal`                                                                | *boolean*                                                                | :heavy_minus_sign:                                                       | Indicates if this status represents a 'completed' state in the workflow. |