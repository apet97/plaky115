// Use the low-level escape hatch to read response metadata (status, requestId).
import { PlakyClient } from "plaky115";
import { clientOptions } from "./env.mjs";

const client = new PlakyClient(clientOptions());

const response = await client.requestWithResponse({
  method: "GET",
  path: "/v1/public/spaces",
});

console.log("status:", response.status);
console.log("requestId:", response.requestId ?? "n/a");
console.log("data:", JSON.stringify(response.data).slice(0, 200));
