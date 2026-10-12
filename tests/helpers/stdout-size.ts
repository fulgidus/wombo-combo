/**
 * Set process.stdout.rows/columns even when stdout is not a TTY, where plain
 * assignment throws "Attempted to assign to readonly property".
 */
export function setStdoutSize(rows: number | undefined, columns: number | undefined): void {
  for (const [key, value] of [["rows", rows], ["columns", columns]] as const) {
    Object.defineProperty(process.stdout, key, { value, configurable: true, writable: true });
  }
}
