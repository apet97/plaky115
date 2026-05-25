# Unit

Represents the type of unit to display.

## Example Usage

```typescript
import { Unit } from "plaky115-mcp/models";

let value: Unit = "CUSTOM_UNIT";

// Open enum: unrecognized values are captured as Unrecognized<string>
```

## Values

```typescript
"DOLLAR" | "EURO" | "POUND" | "PERCENTAGE" | "CUSTOM_UNIT" | "NONE" | Unrecognized<string>
```