/* eslint-disable @typescript-eslint/no-var-requires */
const chalk = require('chalk');

/**
 * @internal
 */
export function colorSupportLevel(): 0 | 1 | 2 | 3 {
  return chalk.supportsColor ? chalk.supportsColor.level : 0;
}
