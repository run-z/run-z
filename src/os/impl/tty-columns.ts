/**
 * @internal
 */
export function ttyColumns(): number {
  return process.stdout.columns || Number(process.env.COLUMNS) || 80;
}
