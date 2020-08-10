/**
 * @packageDocumentation
 * @module run-z/builtins
 */
import type { ZOptionReader } from '@run-z/optionz';
import { helpZOptionReader, ZHelpFormatter } from '@run-z/optionz/help';
import type { ZExtension, ZTaskOption } from '../core';
import { clz, execNoopZProcess } from '../internals';

/**
 * @internal
 */
class ZTaskHelpFormatter extends ZHelpFormatter {

  usage(text: string): string {
    return clz.option(text);
  }

}

/**
 * @internal
 */
function readZHelp(mode?: 'brief' | 'detailed'): ZOptionReader.Fn<ZTaskOption> {

  const formatter = new ZTaskHelpFormatter();

  return option => {
    if (option.pre.isStarted || option.hasAction) {
      return;
    }
    return helpZOptionReader({
      mode,
      display(options) {
        option.executeBy(() => {
          console.log(formatter.help(options));
          return execNoopZProcess();
        });
      },
    })(option);
  };
}

/**
 * Builtin extension for printing help information instead of executing tasks.
 *
 * Supports `-h` and `--help` options.
 */
export const ZHelpBuiltin: ZExtension = {
  options: {
    '-h': {
      read: readZHelp('brief'),
      meta: {
        group: '!builtin:help.brief',
        help: 'Print brief help information',
      },
    },
    '--help': {
      read: readZHelp(),
      meta: {
        group: '!builtin:help.detailed',
        help: 'Print detailed help information',
      },
    },
  },
};
