import { arrayOfElements, valueByRecipe } from '@proc7ts/primitives';
import type { SupportedZOptions } from '@run-z/optionz';
import * as chalk from 'chalk';
import type { ZTaskOption } from '../../task-option';
import type { ZTaskParser } from '../../task-parser';
import type { DraftZTask } from './draft-task';

/**
 * @internal
 */
const fallbackZTaskSpecOptions: SupportedZOptions.Map<ZTaskOption> = {

  '--*=*': {
    read: readNameValueZTaskOption,
    meta: {
      hidden: true,
    },
  },
  '-*=*': {
    read: readNameValueZTaskOption,
    meta: {
      hidden: true,
    },
  },

  '--*': {
    read: readNamedZTaskOption,
    meta: {
      hidden: true,
    },
  },
  '-*': {
    read: readNamedZTaskOption,
    meta: {
      hidden: true,
    },
  },

  './*': {
    read(option) {
      option.pre.nextTarget({ selector: option.name });
      option.values(0);
    },
    meta: {
      get usage() {
        return `./${chalk.green.italic('<PKG-SELECTOR>')} ${chalk.grey('...')}`;
      },
      help: 'Target packages for the tasks',
      get description() {

        const bullet = chalk.hidden('- ') + '-';

        return `
where ${chalk.green.italic('<PKG-SELECTOR>')}:
${bullet} is an URL path to package directory;
${bullet} may contain ${chalk.greenBright('//')} separator to include immediately nested package directories;
${bullet} may contain ${chalk.greenBright('///')} separator to include deeply nested package packages.

Hidden directories ignored.
      `;
      },
    },
  },

  '*=*': {
    read(option) {

      const { name, taskTarget: { setup: { taskParser } } } = option;

      if (taskParser.parseAttr(name, (n, v) => !n.includes('/') && !!option.addAttr(n, v))) {
        option.values(0);
      }
    },
    meta: {
      get usage() {
        return [
          `${chalk.green.italic('<ATTR>')}=${chalk.green.italic('<VALUE>')}`,
          `=${chalk.green.italic('<ATTR>')}`,
        ];
      },
      help: 'Set global attribute',
      get description() {
        return `
The attribute will be set on the task, as well as on its prerequisites.
The ${chalk.green('=' + chalk.italic('<ATTR>'))} means the same as ${
            chalk.green(
                chalk.italic('<ATTR>') + '=' + chalk.italic('<VALUE>'),
            )
        }
        `;
      },
    },
  },

  '/*'(option) {

    const { name } = option;
    const preOption = name.substr(1);

    if (preOption) {
      option.pre.addOption(preOption);
    }
    option.values(0);
  },

  '//*'(option) {
    option.values().slice(0, -1).forEach(preOption => option.pre.addOption(preOption));
  },

  ',': {
    read(option) {
      option.pre.parallelToNext();
      option.values(0);
    },
    meta: {
      usage: `${chalk.green.italic('<TASK>')}, ${chalk.green.italic('<TASK>')}`,
      help: 'Execute tasks in parallel to each other',
    },
  },

  '*': {
    read(option) {

      const { name } = option;

      if (name) {
        option.pre.start(name);
      }
      option.values(0);
    },
    meta: {
      usage: chalk.green.italic('<TASK>'),
      help: 'Task prerequisite',
      description: 'Task prerequisites are executed in order, before the task itself',
    },
  },

};

/**
 * @internal
 */
export function zTaskSpecOptions(
    options?: ZTaskParser.SupportedOptions,
): SupportedZOptions<ZTaskOption, DraftZTask> {

  const providers: SupportedZOptions.Provider<ZTaskOption, DraftZTask>[] = arrayOfElements(options)
      .map(o => ({ builder }) => valueByRecipe(o, builder));

  return [fallbackZTaskSpecOptions, ...providers];
}

/**
 * @internal
 */
function readNamedZTaskOption(option: ZTaskOption): void {
  if (option.pre.isStarted) {
    option.pre.addArg(option.name);
  } else {
    option.addArg(option.name);
  }
  option.values(0);
}

/**
 * @internal
 */
function readNameValueZTaskOption(option: ZTaskOption): void {

  const [value] = option.values(1);
  const arg = `${option.name}=${value}`;

  if (option.pre.isStarted) {
    option.pre.addArg(arg);
  } else {
    option.addArg(arg);
  }
}


