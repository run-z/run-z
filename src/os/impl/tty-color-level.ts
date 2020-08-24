/* eslint-disable @typescript-eslint/no-var-requires */
const chalk = require('chalk');

/**
 * @internal
 */
export function ttyColorLevel(): 0 | 1 | 2 | 3 {
  return chalk.level;
}
