import { asArray, valueByRecipe } from '@proc7ts/primitives';
import type { SupportedZOptions } from '@run-z/optionz';
import { clz } from '@run-z/optionz/colors.js';
import { ZSetup } from '../../../setup.js';
import { ZTaskOption } from '../../task-option.js';
import { ZTaskParser } from '../../task-parser.js';
import { DraftZTask } from './draft-task.js';

/**
 * @internal
 */
function fallbackZTaskSpecOptions({ taskParser }: ZSetup): SupportedZOptions.Map<ZTaskOption> {
  return {
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
        option.pre.nextTarget(taskParser.parseTarget(option.name)!);
        option.recognize();
      },
      meta: {
        group: '!:pre.target',
        get usage() {
          return `./${clz.param('PKG-SELECTOR')} ${clz.sign('...')}`;
        },
        help: 'Execute tasks from selected packages in batch',
        get description() {
          return `
where ${clz.param('PKG-SELECTOR')}:
${clz.bullet()} is an URL path to package directory;
${clz.bullet()} may contain ${clz.usage(
            '//',
          )} separator to select immediately nested package directories;
${clz.bullet()} may contain ${clz.usage(
            '///',
          )} separator to select deeply nested package directories.

Hidden directories ignored.
      `;
        },
      },
    },

    '*=*': {
      read(option) {
        const {
          name,
          taskTarget: {
            setup: { taskParser },
          },
        } = option;

        const onAttr = (name: string, value: string, replacement: boolean): boolean => {
          if (name.includes('/')) {
            return false;
          }

          if (replacement) {
            option.removeAttr(name);
          }
          option.addAttr(name, value);

          return true;
        };

        if (taskParser.parseAttr(name, onAttr)) {
          option.recognize();
        }
      },
      meta: {
        group: '!:run',
        get usage() {
          return [`${clz.param('ATTR')}=${clz.param('VALUE')}`, `=${clz.param('ATTR')}`];
        },
        help: 'Set global attribute',
        get description() {
          return `
The attribute will be set on the task, as well as on its prerequisites.
The ${clz.usage('=' + clz.param('ATTR'))} means the same as ${clz.usage(clz.param('ATTR') + '=on')}
        `;
        },
      },
    },

    '/*': {
      read(option) {
        const { name } = option;
        const preOption = name.substr(1);

        if (preOption) {
          option.pre.addOption(preOption);
        }
        option.recognize();
      },
      meta: {
        group: '!:pre:arg',
        get usage() {
          return `/${clz.param('ARG')}`;
        },
        help: 'Pass attribute or command line argument to preceding task',
      },
    },

    '//*': {
      read(option) {
        option
          .values()
          .slice(0, -1)
          .forEach(preOption => option.pre.addOption(preOption));
      },
      meta: {
        group: '!:pre:args',
        get usage() {
          return `//${clz.param('ARG')} ${clz.sign('...')}//`;
        },
        help: 'Pass multiple attributes or command line arguments to preceding task',
      },
    },

    ',': {
      read(option) {
        option.pre.parallelToNext();
        option.recognize();
      },
      meta: {
        group: '!:pre',
        get usage() {
          return `${clz.param('TASK')}, ${clz.param('TASK')}`;
        },
        help: 'Execute tasks in parallel to each other',
      },
    },

    '*': {
      read(option) {
        let { name } = option;
        let annex = false;

        if (name.startsWith('+')) {
          name = name.substr(1);
          annex = true;
        }
        if (name) {
          option.pre.start(name, annex);
        }
        option.recognize();
      },
      meta: {
        group: '!:pre',
        get usage() {
          return [clz.param('TASK'), `+${clz.param('TASK')}`];
        },
        help: 'Add task prerequisite',
        get description() {
          return `
Prerequisites are tasks executed in order before the task itself.

Each task is executed once even though it can be called multiple times. Call parameters (i.e. command line arguments
and attributes) from multiple calls are merged.

The ${clz.usage(
            '+' + clz.param('TASK'),
          )} form is a task annex. Such form does not cause the task to be executed,
but can provide additional parameters for actual task call, or allow parallel execution with another task.
`;
        },
      },
    },
  };
}

/**
 * @internal
 */
export function zTaskSpecOptions(
  setup: ZSetup,
  options?: ZTaskParser.SupportedOptions,
): SupportedZOptions<ZTaskOption, DraftZTask> {
  const providers: SupportedZOptions.Provider<ZTaskOption, DraftZTask>[] = asArray(options).map(
    o => ({ builder }) => valueByRecipe(o, builder),
  );

  return [fallbackZTaskSpecOptions(setup), ...providers];
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
  option.recognize();
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
