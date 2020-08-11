import { arrayOfElements, valueByRecipe } from '@proc7ts/primitives';
import type { SupportedZOptions } from '@run-z/optionz';
import { clz } from '@run-z/optionz/colors';
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
${clz.bullet} is an URL path to package directory;
${clz.bullet} may contain ${clz.usage('//')} separator to select immediately nested package directories;
${clz.bullet} may contain ${clz.usage('///')} separator to select deeply nested package directories.

Hidden directories ignored.
      `;
      },
    },
  },

  '*=*': {
    read(option) {

      const { name, taskTarget: { setup: { taskParser } } } = option;

      if (taskParser.parseAttr(name, (n, v) => !n.includes('/') && !!option.addAttr(n, v))) {
        option.recognize();
      }
    },
    meta: {
      group: '!:run',
      get usage() {
        return [
          `${clz.param('ATTR')}=${clz.param('VALUE')}`,
          `=${clz.param('ATTR')}`,
        ];
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
      option.values().slice(0, -1).forEach(preOption => option.pre.addOption(preOption));
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

      const { name } = option;

      if (name) {
        option.pre.start(name);
      }
      option.recognize();
    },
    meta: {
      group: '!:pre',
      get usage() {
        return clz.param('TASK');
      },
      help: 'Add task prerequisite',
      description: 'Task prerequisites executed in order before the task itself.',
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


