# ReactionPutResponse

Represents response on reaction(s) change.

## Example Usage

```typescript
import { ReactionPutResponse } from "plaky115/models";

let value: ReactionPutResponse = {};
```

## Fields

| Field                                                                                                                | Type                                                                                                                 | Required                                                                                                             | Description                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `reactions`                                                                                                          | Record<string, [models.ReactionResponseNoCode](../models/reaction-response-no-code.md)[]>                            | :heavy_minus_sign:                                                                                                   | A map containing reaction code as a key and the list of reactions without code<br/>(ReactionResponseNoCode) as a value.<br/> |