<!-- Start SDK Example Usage [usage] -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.spaces.getSpaces({
    expand: [],
  });

  console.log(result);
}

run();

```
<!-- End SDK Example Usage [usage] -->