# SubitemsBehaviour

Indicates how subitems are treated in the response. By default subitems will be included.
This flag is not applicable when **parentId** is set.

**Options:**
* **INCLUDE**: Includes subitems in the top level response.
* **EXCLUDE**: Excludes subitems from the top level response.
* **EMBED**: Excludes from top level and embeds into each parent with sorts and filters applied.


## Example Usage

```typescript
import { SubitemsBehaviour } from "plaky115/models/operations";

let value: SubitemsBehaviour = "EXCLUDE";
```

## Values

```typescript
"INCLUDE" | "EXCLUDE" | "EMBED"
```