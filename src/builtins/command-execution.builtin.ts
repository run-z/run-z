/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZExtension, ZTaskOption } from '../core';

/**
 * Command execution built-in extension.
 *
 * Supports `--and` and `--then` options.
 */
export const ZCommandExecutionBuiltin: ZExtension = {
  options: {
    '--and': readZTaskCommand.bind(undefined, true),
    '--then': readZTaskCommand.bind(undefined, false),
  },
};

/**
 * @internal
 */
function readZTaskCommand(parallel: boolean, option: ZTaskOption): void {

  const [command, ...args] = option.rest();

  if (command) {
    option.setAction({
      type: 'command',
      command,
      parallel,
      args,
    });
  }
}
