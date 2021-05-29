import ProcessEnv = NodeJS.ProcessEnv;

/**
 * @internal
 */
export function ttyColumns(env: ProcessEnv = process.env): number {
  return process.stdout.columns || Number(env.COLUMNS) || 80;
}
