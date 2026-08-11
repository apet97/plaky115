import { redact, type MutationErrorSummary, type MutationPhase, type MutationReceipt, type MutationReceiptStatus } from "plaky115";

const MAX_ATTEMPT_TEXT_LENGTH = 1_024;
const MAX_INT64 = 9_223_372_036_854_775_807n;
const DECIMAL_ID = /^(0|[1-9]\d*)$/;

export type McpAttemptSnapshot = Readonly<{
  attempted: boolean;
  mayHaveCommitted: boolean;
  phase: MutationPhase;
  receipts: readonly MutationReceipt[];
}>;

export type MutationCall<T> = {
  operation: string;
  targetIds: Readonly<Record<string, string>>;
  run: () => Promise<T>;
  createdIdKey?: string;
};

export type McpMutationAttempt = {
  mutate<T>(call: MutationCall<T>): Promise<T>;
  record(receipts: readonly MutationReceipt[]): void;
  snapshot(): McpAttemptSnapshot;
};

export class McpMutationAttemptError extends Error {
  readonly receipts: readonly MutationReceipt[];

  constructor(message: string, receipts: readonly MutationReceipt[], options?: { cause?: unknown }) {
    super(boundText(message));
    this.name = "McpMutationAttemptError";
    this.receipts = freezeReceipts(receipts);
    if (options?.cause !== undefined) {
      Object.defineProperty(this, "cause", {
        configurable: true,
        enumerable: false,
        value: options.cause,
        writable: true,
      });
    }
  }
}

export function createMutationAttempt(): McpMutationAttempt {
  let receipts: readonly MutationReceipt[] = Object.freeze([]);

  return {
    async mutate<T>(call: MutationCall<T>): Promise<T> {
      const planned = makeReceipt(call.operation, 0, "planned", "preflight", false, false, call.targetIds);
      const started = makeReceipt(call.operation, 0, "request-started", "request", true, true, call.targetIds);
      receipts = Object.freeze([planned]);
      receipts = Object.freeze([started]);
      try {
        const result = await call.run();
        let targetIds = call.targetIds;
        if (call.createdIdKey !== undefined) {
          try {
            const createdId = canonicalCreatedId(result);
            targetIds = { ...targetIds, [call.createdIdKey]: createdId };
          } catch (error) {
            const ambiguous = makeReceipt(
              call.operation,
              0,
              "ambiguous",
              "response",
              true,
              true,
              call.targetIds,
              mutationErrorSummary(error),
            );
            receipts = Object.freeze([ambiguous]);
            throw new McpMutationAttemptError("Mutation response did not include a canonical created ID.", receipts, { cause: error });
          }
        }
        receipts = Object.freeze([
          makeReceipt(call.operation, 0, "completed", "completed", true, false, targetIds),
        ]);
        return result;
      } catch (error) {
        if (error instanceof McpMutationAttemptError) throw error;
        const ambiguous = makeReceipt(
          call.operation,
          0,
          "ambiguous",
          "response",
          true,
          true,
          call.targetIds,
          mutationErrorSummary(error),
        );
        receipts = Object.freeze([ambiguous]);
        throw error;
      }
    },

    record(nextReceipts: readonly MutationReceipt[]): void {
      receipts = freezeReceipts(nextReceipts);
    },

    snapshot(): McpAttemptSnapshot {
      const attempted = receipts.some((receipt) => receipt.attempted);
      const mayHaveCommitted = receipts.some((receipt) => receipt.mayHaveCommitted);
      const phase = aggregatePhase(receipts);
      return Object.freeze({ attempted, mayHaveCommitted, phase, receipts });
    },
  };
}

function makeReceipt(
  operation: string,
  index: number,
  status: MutationReceiptStatus,
  phase: MutationPhase,
  attempted: boolean,
  mayHaveCommitted: boolean,
  targetIds: Readonly<Record<string, string>>,
  error?: MutationErrorSummary,
): MutationReceipt {
  return freezeReceipt({
    operation,
    index,
    status,
    attempted,
    mayHaveCommitted,
    phase,
    targetIds,
    ...(error === undefined ? {} : { error }),
  });
}

function freezeReceipts(receipts: readonly MutationReceipt[]): readonly MutationReceipt[] {
  return Object.freeze(receipts.map(freezeReceipt));
}

function freezeReceipt(receipt: MutationReceipt): MutationReceipt {
  const targetIds = Object.freeze(
    Object.fromEntries(
      Object.entries(receipt.targetIds).map(([key, value]) => [boundText(key, 128), boundText(String(value), 128)]),
    ),
  );
  const error = receipt.error === undefined
    ? undefined
    : Object.freeze({
      name: boundText(receipt.error.name, 128),
      message: boundText(receipt.error.message),
    });
  return Object.freeze({
    operation: boundText(receipt.operation, 256),
    index: receipt.index,
    status: receipt.status,
    attempted: receipt.attempted,
    mayHaveCommitted: receipt.mayHaveCommitted,
    phase: receipt.phase,
    targetIds,
    ...(error === undefined ? {} : { error }),
  });
}

function mutationErrorSummary(error: unknown): MutationErrorSummary {
  const name = error instanceof Error && error.name.length > 0 ? error.name : "Error";
  const message = error instanceof Error && error.message.length > 0 ? error.message : "Mutation failed.";
  return Object.freeze({ name: boundText(name, 128), message: boundText(message) });
}

function canonicalCreatedId(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("mutation response is not an object");
  const id = (value as { id?: unknown }).id;
  if (typeof id === "number") {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error("mutation response ID is not a safe integer");
    return String(id);
  }
  if (typeof id !== "string" || !DECIMAL_ID.test(id) || BigInt(id) > MAX_INT64) {
    throw new Error("mutation response ID is not a canonical signed int64");
  }
  return id;
}

function aggregatePhase(receipts: readonly MutationReceipt[]): MutationPhase {
  if (receipts.some((receipt) => receipt.status === "ambiguous" || receipt.status === "failed")) return "response";
  if (receipts.some((receipt) => receipt.status === "request-started")) return "request";
  if (receipts.some((receipt) => receipt.status === "completed")) return "completed";
  return "preflight";
}

function boundText(value: string, limit = MAX_ATTEMPT_TEXT_LENGTH): string {
  const redacted = redact(value);
  let safe = "";
  for (let index = 0; index < redacted.length; index++) {
    const character = redacted[index]!;
    const code = redacted.charCodeAt(index);
    safe += code < 0x20 || code === 0x7f ? " " : character;
  }
  return safe.length <= limit ? safe : `${safe.slice(0, limit - 1)}…`;
}
