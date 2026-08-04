import { PlakyError } from "./errors.js";
import { redact } from "./redact.js";

const MAX_MUTATION_TEXT_LENGTH = 1_024;

export type MutationReceiptStatus = "planned" | "request-started" | "completed" | "failed" | "ambiguous";
export type MutationPhase = "preflight" | "request" | "response" | "completed";

export type MutationErrorSummary = Readonly<{
  name: string;
  message: string;
}>;

/** A durable, safe snapshot of one mutation attempt. */
export type MutationReceipt = Readonly<{
  operation: string;
  index: number;
  status: MutationReceiptStatus;
  attempted: boolean;
  mayHaveCommitted: boolean;
  phase: MutationPhase;
  targetIds: Readonly<Record<string, string>>;
  error?: MutationErrorSummary;
}>;

/**
 * Thrown when a batch mutation cannot finish with a single known outcome.
 * Receipts are copied and frozen so callers can retain them across callbacks,
 * aborts, and protocol conversion without observing later internal changes.
 */
export class PlakyPartialMutationError extends PlakyError {
  readonly receipts: readonly MutationReceipt[];
  readonly failedIndex?: number;

  constructor(
    message: string,
    receipts: readonly MutationReceipt[],
    options?: { cause?: unknown; failedIndex?: number },
  ) {
    super(boundMutationText(message), options);
    this.receipts = freezeMutationReceipts(receipts);
    if (options?.failedIndex !== undefined) this.failedIndex = options.failedIndex;
  }
}

/** Copy and freeze a receipt before it crosses an API boundary. */
export function freezeMutationReceipt(receipt: MutationReceipt): MutationReceipt {
  const targetIds = Object.freeze(
    Object.fromEntries(
      Object.entries(receipt.targetIds).map(([key, value]) => [boundMutationText(key, 128), boundMutationText(String(value), 128)]),
    ),
  );
  const error = receipt.error === undefined
    ? undefined
    : Object.freeze({
      name: boundMutationText(receipt.error.name, 128),
      message: boundMutationText(receipt.error.message),
    });
  return Object.freeze({
    operation: boundMutationText(receipt.operation, 256),
    index: receipt.index,
    status: receipt.status,
    attempted: receipt.attempted,
    mayHaveCommitted: receipt.mayHaveCommitted,
    phase: receipt.phase,
    targetIds,
    ...(error === undefined ? {} : { error }),
  });
}

/** Copy and freeze an ordered receipt collection. */
export function freezeMutationReceipts(receipts: readonly MutationReceipt[]): readonly MutationReceipt[] {
  return Object.freeze(receipts.map(freezeMutationReceipt));
}

export function mutationErrorSummary(error: unknown): MutationErrorSummary {
  const name = error instanceof Error && error.name.length > 0 ? error.name : "Error";
  const message = error instanceof Error && error.message.length > 0 ? error.message : "Mutation failed.";
  return Object.freeze({ name: boundMutationText(name, 128), message: boundMutationText(message) });
}

function boundMutationText(value: string, limit = MAX_MUTATION_TEXT_LENGTH): string {
  const safe = redact(value).replace(/[\u0000-\u001f\u007f]/g, " ");
  return safe.length <= limit ? safe : `${safe.slice(0, limit - 1)}…`;
}
