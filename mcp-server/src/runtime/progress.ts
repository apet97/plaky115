export function createProgressReporter(
  send: (progress: number, total: number, message: string) => Promise<void>,
  total: number,
  message: string,
  maxUpdates = 20,
): (progress: number) => void {
  const step = Math.max(1, Math.ceil(total / maxUpdates));
  let last = 0;
  return (progress) => {
    if (progress < total && progress - last < step) return;
    last = progress;
    void send(progress, total, message).catch(() => {});
  };
}
