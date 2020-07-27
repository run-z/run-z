import { thruIt } from '@proc7ts/a-iterable';
import { nextSkip } from '@proc7ts/call-thru';
import type { SupportedZOptions } from '../options';
import { ZOptionInput, ZOptionPuller } from '../options';
import { ZOptionBaseClass, ZOptionImplClass, ZOptionsParser } from '../options/options-parser.impl';
import type { ZSetup } from '../setup';
import { InvalidZTaskError } from './invalid-task-error';
import type { ZTaskOption } from './task-option';
import type { ZTaskParser } from './task-parser';
import { ZTaskSpec } from './task-spec';

/**
 * @internal
 */
export class ZTaskCLParser extends ZOptionsParser<ZTaskCLData, ZTaskCLOption> {

  constructor(readonly setup: ZSetup) {
    super({
      options: zTaskCLOptions(),
      puller: zTaskCLPullers(setup),
    });
  }

  async parseTask(entries: readonly string[]): Promise<ZTaskSpec> {

    const data = new ZTaskCLData(this);

    await this.parseOptions(data, entries);

    data.finishPre();

    return {
      pre: data.pre,
      attrs: data.attrs,
      args: data.args,
      action: data.action || ZTaskSpec.groupAction,
    };
  }

  optionClass<TArgs extends any[]>(
      base: ZOptionBaseClass<TArgs>,
  ): ZOptionImplClass<ZTaskCLOption, ZTaskCLData, TArgs> {

    const setup = this.setup;

    class TaskOption extends base implements ZTaskCLOption {

      constructor(readonly data: ZTaskCLData, ...args: TArgs) {
        super(...args);
        data.moveTo(this);
      }

      get setup(): ZSetup {
        return setup;
      }

      get taskParser(): ZTaskParser {
        return setup.taskParser;
      }

      addPre(pre: ZTaskSpec.Pre): void {
        this.data.pre.push(pre);
      }

      addAttr(name: string, value: string): void {
        recordZTaskAttr(this.data.attrs, name, value);
      }

      addArg(arg: string): void {
        this.data.args.push(arg);
      }

      setAction(action: ZTaskSpec.Action): void {
        this.data.action = action;
      }

    }

    return TaskOption;
  }

}

/**
 * @internal
 */
function zTaskCLOptions(): SupportedZOptions<ZTaskCLData, ZTaskCLOption> {
  return {

    '--and': readZTaskCommand.bind(undefined, true),
    '--then': readZTaskCommand.bind(undefined, false),

    '-*': readNamedZTaskArg,
    '--*': readNamedZTaskArg,

    './*'(option: ZTaskCLOption): void {

      const { data } = option;

      // Package reference
      data.finishPre();
      option.addPre({ selector: option.name });
      option.values(0);
    },

    '*=*'(option: ZTaskCLOption): void {

      const { name, taskParser, data } = option;

      if (taskParser.parseAttr(name, (n, v) => !n.includes('/') && option.addAttr(n, v))) {
        data.finishPre();
        option.values(0);
      }
    },

    '/*'(option: ZTaskCLOption): void {

      const { name, data } = option;
      const preArg = name.substr(1);

      if (preArg) {
        data.addPreArgs(preArg);
      }
      option.values(0);
    },

    '//*'(option: ZTaskCLOption): void {
      option.data.addPreArgs(...option.values().slice(0, -1));
    },

    ','(option: ZTaskCLOption): void {

      const { data } = option;

      data.finishPre();
      data.preParallel = true;
      option.values(0);
    },

    '*'(option: ZTaskCLOption): void {

      const { data, name: task } = option;

      if (task) {
        data.finishPre();
        option.values(0);
        data.preTask = task;
      }
    },

  };
}

/**
 * @internal
 */
function readNamedZTaskArg(option: ZTaskCLOption): void {
  option.addArg(option.name);
  for (const arg of option.values()) {
    option.addArg(arg);
  }
}

/**
 * @internal
 */
function readZTaskCommand(parallel: boolean, option: ZTaskCLOption): void {

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

/**
 * @internal
 */
function zTaskCLPullers(setup: ZSetup): readonly ZOptionPuller[] {
  return [
    ZOptionPuller.long,
    ZOptionPuller.short,
    pullZPackageRef.bind(undefined, setup),
    pullZTaskAttr.bind(undefined, setup),
    pullZTaskPreArgs,
    pullParallelZTasks,
    pullZTaskPre,
    pullZTaskShorthandPreArg,
    ZOptionPuller.any,
  ];
}

/**
 * @internal
 */
function pullZPackageRef({ taskParser }: ZSetup, args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

  const [name] = args;

  if (!taskParser.isPackageSelector(name)) {
    return [];
  }

  const tail = args.slice(1);

  return [
    { name, tail },
    { key: './*', name, tail },
  ];
}

/**
 * @internal
 */
function pullZTaskAttr({ taskParser }: ZSetup, args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

  const [first] = args;
  const attr = taskParser.parseAttr(first);

  if (!attr) {
    return [];
  }

  const [attrName, attrValue] = attr;
  const name = `${attrName}=${attrValue}`;
  const tail = args.slice(1);

  return [
    {
      name,
      tail,
    },
    {
      key: `${attrName}=*`,
      name,
      tail,
    },
    {
      key: `*=*`,
      name,
      tail,
    },
  ];
}

/**
 * @internal
 */
function pullZTaskPreArgs(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

  const [first] = args;
  const openingIdx = first.indexOf('//');

  if (openingIdx < 0) {
    return [];
  }
  if (openingIdx) {
    // Opening delimiter is not at the first position
    // Split and retry
    return [
      {
        name: first.substr(0, openingIdx),
        tail: [first.substr(openingIdx), ...args.slice(1)],
        retry: true,
      },
    ];
  }

  let contentIdx = openingIdx + 2;

  while (first[contentIdx] === '/') {
    ++contentIdx;
  }

  const delimiter = first.substring(openingIdx, contentIdx);
  const closingIdx = first.indexOf(delimiter, contentIdx);

  if (closingIdx > 0) {
    // First arg contains both opening and closing delimiter

    const values = contentIdx < first.length ? [first.substring(contentIdx, closingIdx), '//'] : ['//'];
    const afterPreArgsIdx = closingIdx + delimiter.length;
    const restArgs = args.slice(1);
    const tail = afterPreArgsIdx < first.length ? [first.substr(afterPreArgsIdx), ...restArgs] : restArgs;

    return [{
      key: '//*',
      name: delimiter,
      values,
      tail,
    }];
  }

  // Search for closing delimiter
  for (let i = 1; i < args.length; ++i) {

    const arg = args[i];
    const closingIdx = arg.indexOf(delimiter);

    if (closingIdx >= 0) {
      // Closing delimiter found

      const restValues = args.slice(1, i);
      const lastValues = closingIdx ? [arg.substr(0, closingIdx)] : [];
      const values = contentIdx < first.length
          ? [first.substr(contentIdx), ...restValues, ...lastValues, '//']
          : [...restValues, ...lastValues, '//'];
      const afterPreArgsIdx = closingIdx + delimiter.length;
      const restArgs = args.slice(i + 1);
      const tail = afterPreArgsIdx < arg.length
          ? [arg.substr(afterPreArgsIdx), ...restArgs]
          : [...restArgs];

      return [{
        key: '//*',
        name: delimiter,
        values,
        tail,
      }];
    }
  }

  // No closing delimiter.
  // Treat the rest of args as prerequisite ones.
  return [{
    key: '//*',
    name: delimiter,
    values: [first.substr(contentIdx), ...args.slice(1), '//'],
  }];
}

/**
 * @internal
 */
const parallelZTaskSep = /(,)/;

/**
 * @internal
 */
function pullParallelZTasks(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

  const [entry] = args;
  const [name, ...values] = entry.split(parallelZTaskSep).filter(name => !!name);

  return values.length ? [{ name, values, tail: args.slice(1), retry: true }] : [];
}

/**
 * @internal
 */
function pullZTaskPre(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

  const [entry] = args;
  const [name, ...preArgs] = entry.split('/');

  if (!name || !preArgs.length) {
    return [];
  }

  return [{
    name,
    values: Array.from(
        thruIt(
            preArgs,
            preArg => preArg ? '/' + preArg : nextSkip,
        ),
    ),
    tail: args.slice(1),
    retry: true,
  }];
}

/**
 * @internal
 */
function pullZTaskShorthandPreArg(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

  const [name] = args;

  if (!name.startsWith('/') || name.startsWith('//')) {
    return [];
  }

  const tail = args.slice(1);

  return [
    {
      name,
      tail,
    },
    {
      key: '/*',
      name,
      tail,
    },
  ];
}

/**
 * @internal
 */
export class ZTaskCLData {

  private _option!: ZTaskCLOption;
  readonly pre: ZTaskSpec.Pre[] = [];
  readonly attrs: Record<string, [string, ...string[]]> = {};
  readonly args: string[] = [];
  action?: ZTaskSpec.Action;
  preTask: string | undefined;
  preParallel = false;
  private _preArgs: string[] = [];
  private _preArgsAt = 0;

  constructor(readonly clParser: ZTaskCLParser) {
  }

  moveTo(option: ZTaskCLOption): void {
    this._option = option;
  }

  addPreArgs(...args: readonly string[]): void {
    if (!this._preArgs.length) {
      this._preArgsAt = this._option.argIndex;
    }
    this._preArgs.push(...args);
  }

  finishPre(): void {
    if (this.preTask) {
      // Finish the task.
      this.pre.push(createZTaskRef(
          this.clParser.setup.taskParser,
          this.preTask,
          this.preParallel,
          this._preArgs,
      ));
      this._preArgs = [];
      this.preParallel = false;
      this.preTask = undefined;
    } else if (this._preArgs.length) {
      this.parseError('Prerequisite arguments specified, but not the task');
    }
  }

  parseError(message: string): never {

    const { args } = this._option;
    let position = 0;
    let reconstructedCmd = '';

    for (let i = 0; i < args.length; ++i) {
      if (reconstructedCmd) {
        reconstructedCmd += ' ';
      }

      const arg = args[i];

      if (i === this._preArgsAt) {
        position = reconstructedCmd.length;
      }

      reconstructedCmd += arg;
    }

    throw new InvalidZTaskError(message, reconstructedCmd, position);
  }

}

interface ZTaskCLOption extends ZTaskOption {

  readonly taskParser: ZTaskParser;

  readonly data: ZTaskCLData;

}

/**
 * @internal
 */
function createZTaskRef(
    parser: ZTaskParser,
    task: string,
    parallel: boolean,
    allArgs: string[],
): ZTaskSpec.TaskRef {

  const attrs: Record<string, [string, ...string[]]> = {};
  const args: string[] = [];

  for (const arg of allArgs) {
    if (!parser.parseAttr(arg, attrs)) {
      args.push(arg);
    }
  }

  return {
    task,
    parallel,
    attrs,
    args,
  };
}

/**
 * @internal
 */
export function recordZTaskAttr(attrs: Record<string, string[]>, name: string, value: string): void {
  if (attrs[name]) {
    attrs[name].push(value);
  } else {
    attrs[name] = [value];
  }
}
