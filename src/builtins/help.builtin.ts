/**
 * @packageDocumentation
 * @module run-z/builtins
 */
import { noop } from '@proc7ts/primitives';
import type { ZOptionReader } from '@run-z/optionz';
import type { ZOptionMeta } from '@run-z/optionz/d.ts/option-meta';
import { helpZOptionReader, ZHelpFormatter } from '@run-z/optionz/help';
import type { ZExtension, ZTaskOption } from '../core';
import { execZ } from '../internals';

/**
 * @internal
 */
function readZHelp(mode?: 'brief' | 'detailed'): ZOptionReader.Fn<ZTaskOption> {

  const formatter = new ZHelpFormatter();
  const printHelp = async (options: ZOptionMeta.List): Promise<void> => {
    console.log(await formatter.help(options));
  };
  const printer = helpZOptionReader<ZTaskOption>({
    mode,
    display(options, option) {
      option.executeBy(() => execZ(() => {

        const whenDone = printHelp(options);

        return {
          whenDone() {
            return whenDone;
          },
          abort: noop,
        };
      }));
    },
  });

  return option => {
    if (option.pre.isStarted || option.hasAction) {
      return;
    }
    return printer(option);
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
