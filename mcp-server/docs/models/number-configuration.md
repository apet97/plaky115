# NumberConfiguration

Represents configuration for number attribute.

## Example Usage

```typescript
import { NumberConfiguration } from "plaky115-mcp/models";

let value: NumberConfiguration = {};
```

## Fields

| Field                                                                 | Type                                                                  | Required                                                              | Description                                                           |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `unit`                                                                | [models.Unit](../models/unit.md)                                      | :heavy_minus_sign:                                                    | Represents the type of unit to display.                               |
| `customUnitValue`                                                     | *string*                                                              | :heavy_minus_sign:                                                    | Represents a custom string value for the unit if unit type is custom. |
| `unitAlignment`                                                       | [models.UnitAlignment](../models/unit-alignment.md)                   | :heavy_minus_sign:                                                    | Represents positioning of the unit relative to the number.            |
| `alignment`                                                           | [models.Alignment](../models/alignment.md)                            | :heavy_minus_sign:                                                    | Represents text alignment of the number within the cell.              |