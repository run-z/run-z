import { noop } from '@proc7ts/primitives';
import { execZ } from '@run-z/exec-z';
import type { ZOptionMeta, ZOptionReader } from '@run-z/optionz';
import { helpZOptionReader, ZHelpFormatter } from '@run-z/optionz/help';
import type { ZExtension, ZTaskOption } from '../core';

/**
 * @internal
 */
function readZHelp(mode?: 'brief' | 'detailed'): ZOptionReader.Fn<ZTaskOption> {

  const formatter = new ZHelpFormatter();
  const printHelp = async (options: ZOptionMeta.List): Promise<void> => {
    console.log(await formatter.help(options));
  };

  return helpZOptionReader<ZTaskOption>({
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
}

/**
 * Builtin extension for printing help information instead of executing tasks.
 *
 * Supports `-h` and `--help` options.
 */
export const ZHelpBuiltin: ZExtension = {
  shellOptions: {
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
