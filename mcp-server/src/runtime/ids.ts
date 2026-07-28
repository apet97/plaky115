import { z } from "zod/v3";

const MAX_INT64 = 9_223_372_036_854_775_807n;
const decimal = /^(0|[1-9]\d*)$/;

/** Exact non-negative OpenAPI int64 identifier, normalized to a decimal string. */
export const int64Id = z.union([
  z.string().regex(decimal, "identifier must be a canonical non-negative decimal string"),
  z.number().int().nonnegative().safe("unsafe numbers must be passed as decimal strings"),
]).transform(String).refine(
  (value) => BigInt(value) <= MAX_INT64,
  "identifier exceeds signed int64 range",
);
