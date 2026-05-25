# Limit

Represents limit configuration for the number of persons that can be assigned.

## Example Usage

```typescript
import { Limit } from "plaky115/models";

let value: Limit = "ONE";

// Open enum: unrecognized values are captured as Unrecognized<string>
```

## Values

```typescript
"ONE" | "TWO" | "THREE" | "UNLIMITED" | Unrecognized<string>
```