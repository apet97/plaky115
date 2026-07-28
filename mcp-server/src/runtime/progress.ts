export function createProgressReporter(
  send: (progress: number, total: number, message: string) => Promise<void>,
  total: number,
  message: string,
  maxUpdates = 20,
): (progress: number) => Promise<void> {
  const step = Math.max(1, Math.ceil(total / maxUpdates));
  let last = 0;
  return async (progress) => {
    if (progress < total && progress - last < step) return;
    last = progress;
    try {
      await send(progress, total, message);
    } catch {
      // Progress is best-effort and must not turn a completed tool into a failure.
    }
  };
}
