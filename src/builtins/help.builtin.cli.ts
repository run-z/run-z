/**
 * @packageDocumentation
 * @module run-z/builtins
 */
import * as chalk from 'chalk';
import cliui from 'cliui';
import type { ZExtension, ZTaskOption } from '../core';
import { execNoopZProcess } from '../core/jobs/impl';

/**
 * Builtin extension for printing help information instead of executing tasks.
 *
 * Supports `-h` and `--help` options.
 */
export const ZHelpBuiltin: ZExtension = {
  options: {
    '-h': {
      read: readZHelp.bind(undefined, false),
      meta: {
        help: 'Prints brief help information',
      },
    },
    '--help': {
      read: readZHelp.bind(undefined, true),
      meta: {
        help: 'Prints detailed help information',
      },
    },
  },
};

/**
 * @internal
 */
function readZHelp(detailed: boolean, option: ZTaskOption): void {
  if (option.pre.isStarted || option.action) {
    return;
  }

  option.recognize();
  option.executeBy(() => {
    printZHelp(detailed, option);
    return execNoopZProcess();
  });

}

/**
 * @internal
 */
function printZHelp(detailed: boolean, option: ZTaskOption): void {

  const ui = cliui();
  const options = Array.from(option.supportedOptions()).sort();

  for (const key of options) {

    const meta = option.optionMeta(key);
    let text: string | undefined;

    if (detailed) {
      if (meta.help) {
        if (meta.description) {
          text = `${meta.help}\n${meta.description}`;
        } else {
          text = meta.help;
        }
      } else if (meta.description != null) {
        text = meta.description;
      } else if (meta.usage.length === 1 && meta.usage[0] === key) {
        continue;
      } else {
        text = '';
      }
    } else {
      if (!meta.help) {
        continue;
      }
      text = meta.help;
    }

    ui.div(
        meta.usage.map(usage => chalk.greenBright(usage)).join('\n'),
        text,
    );
  }

  console.log(ui.toString());
}
