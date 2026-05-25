# ItemAttributeDefinition

## Example Usage

```typescript
import { ItemAttributeDefinition } from "plaky115/models";

let value: ItemAttributeDefinition = {};
```

## Fields

| Field                                                                             | Type                                                                              | Required                                                                          | Description                                                                       |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `id`                                                                              | *number*                                                                          | :heavy_minus_sign:                                                                | Represents unique identifier of the item attribute.                               |
| `name`                                                                            | *string*                                                                          | :heavy_minus_sign:                                                                | Represents name of the item attribute.                                            |
| `description`                                                                     | *string*                                                                          | :heavy_minus_sign:                                                                | Represents description of the item attribute.                                     |
| `key`                                                                             | *string*                                                                          | :heavy_minus_sign:                                                                | Represents key of the item attribute.                                             |
| `type`                                                                            | [models.ItemAttributeDefinitionType](../models/item-attribute-definition-type.md) | :heavy_minus_sign:                                                                | Represents type of the item attribute.                                            |
| `configuration`                                                                   | *models.Configuration*                                                            | :heavy_minus_sign:                                                                | Represents configuration of the item attribute.                                   |