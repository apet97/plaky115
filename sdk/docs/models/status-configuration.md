# StatusConfiguration

Represents configuration for status attribute.

## Example Usage

```typescript
import { StatusConfiguration } from "plaky115/models";

let value: StatusConfiguration = {};
```

## Fields

| Field                                                                  | Type                                                                   | Required                                                               | Description                                                            |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `values`                                                               | [models.StatusLabelDefinition](../models/status-label-definition.md)[] | :heavy_minus_sign:                                                     | Represents list of possible status labels.                             |
| `defaultValue`                                                         | *string*                                                               | :heavy_minus_sign:                                                     | Represents the key of the default status label.                        |