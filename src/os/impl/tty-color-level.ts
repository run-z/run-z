import chalk from 'chalk';

/**
 * @internal
 */
export function ttyColorLevel(): 0 | 1 | 2 | 3 {
  return chalk.level;
}
