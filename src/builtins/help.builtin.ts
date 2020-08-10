/**
 * @packageDocumentation
 * @module run-z/builtins
 */
import { flatMapIt, itsReduction, makeIt } from '@proc7ts/a-iterable';
import stringWidth from 'string-width';
import type { ZExtension, ZTaskOption } from '../core';
import { clz, execNoopZProcess } from '../internals';

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
        help: 'Print brief help information',
      },
    },
    '--help': {
      read: readZHelp.bind(undefined, true),
      meta: {
        help: 'Print detailed help information',
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

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cliui = require('cliui');
  const ui = cliui();
  const options = printZHelpOptions(detailed, option);
  const usageWidth = printZHelpUsageWidth(options);

  for (const [usage, text] of options) {

    const usageText = usage.map(usage => clz.option(usage)).join('\n');

    ui.div(
        {
          text: usageText,
          width: usageWidth,
          padding: detailed ? [1, 1, 0, 2] : [0, 1, 0, 2],
        },
        {
          text,
          padding: detailed ? [1, 0, 0, 1] : [0, 0, 0, 1],
        },
    );
  }

  console.log(ui.toString());
}

/**
 * @internal
 */
function printZHelpOptions(detailed: boolean, option: ZTaskOption): Iterable<[readonly string[], string]> {

  const options = Array.from(option.supportedOptions()).sort();

  return makeIt(function *() {
    for (const key of options) {

      const meta = option.optionMeta(key);
      let text: string | undefined;
      const { usage, help } = meta;

      if (detailed) {

        const { description = '' } = meta;

        if (help) {
          if (description) {
            text = `${help.trim()}\n\n${description.trim()}`;
          } else {
            text = help.trim();
          }
        } else {
          text = description.trim();
        }
      } else {
        if (!help) {
          continue;
        }
        text = help.trim();
      }

      yield [usage, text];
    }
  });
}

/**
 * @internal
 */
function printZHelpUsageWidth(options: Iterable<[readonly string[], string]>): number {
  return itsReduction(
      flatMapIt(
          options,
          ([usage]) => usage,
      ),
      (prev, usage) => Math.max(prev, stringWidth(usage)),
      12,
  ) + 3;
}
