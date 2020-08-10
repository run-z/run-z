/**
 * @packageDocumentation
 * @module run-z/builtins
 */
import type { ZExtension, ZTaskOption } from '../core';
import { clz } from '../internals';

/**
 * Command execution built-in extension.
 *
 * Supports `--and` and `--then` options.
 */
export const ZCommandExecutionBuiltin: ZExtension = {
  options: {
    '--then': {
      read: readZTaskCommand.bind(undefined, false),
      meta: {
        group: '!builtin:exec',
        get usage() {
          return `${clz.option('--then')} ${clz.param('COMMAND')} `
              + clz.optional(clz.param('ARG') + clz.sign(' ...'));
        },
        get help() {
          return `Execute ${clz.param('COMMAND')} after prerequisites`;
        },
        get description() {
          return `
${clz.option('--and')} executes the ${clz.param('COMMAND')} in parallel to the last prerequisite.
        `;
        },
      },
    },
    '--and': {
      read: readZTaskCommand.bind(undefined, true),
      meta: {
        aliasOf: '--then',
        get usage() {
          return `${clz.option('--and')} ${clz.param('COMMAND')} `
              + clz.optional(clz.param('ARG') + clz.sign(' ...'));
        },
      },
    },
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
