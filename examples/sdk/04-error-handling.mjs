// Demonstrate typed error handling. Forces a 404 by requesting a missing space.
import {
  PlakyClient,
  PlakyApiError,
  PlakyNotFoundError,
  PlakyRateLimitError,
  PlakyTimeoutError,
} from "plaky115";
import { clientOptions } from "./env.mjs";

const client = new PlakyClient(clientOptions());

try {
  await client.spaces.get(999999999);
  console.log("unexpected: request succeeded");
} catch (error) {
  if (error instanceof PlakyNotFoundError) {
    console.log("not found (404):", error.status, "requestId:", error.requestId ?? "n/a");
  } else if (error instanceof PlakyRateLimitError) {
    console.log("rate limited (429); retry after ms:", error.retryAfterMs);
  } else if (error instanceof PlakyTimeoutError) {
    console.log("timed out");
  } else if (error instanceof PlakyApiError) {
    console.log("api error:", error.status, error.code ?? "");
  } else {
    throw error;
  }
}
