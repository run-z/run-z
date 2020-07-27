import { thruIt } from '@proc7ts/a-iterable';
import { nextSkip } from '@proc7ts/call-thru';
import type { SupportedZOptions } from '../../options';
import { ZOptionInput, ZOptionSyntax } from '../../options';
import { ZOptionBaseClass, ZOptionImplClass, ZOptionsParser } from '../../options/options-parser.impl';
import type { ZSetup } from '../../setup';
import { InvalidZTaskError } from '../invalid-task-error';
import type { ZTaskOption } from '../task-option';
import type { ZTaskParser } from '../task-parser';
import { ZTaskSpec } from '../task-spec';

/**
 * @internal
 */
export class ZTaskCLParser extends ZOptionsParser<ZTaskBuilder, ZTaskOption> {

  constructor(readonly setup: ZSetup) {
    super({
      options: zTaskCLOptions(),
      syntax: zTaskCLPullers(setup),
    });
  }

  async parseTask(entries: readonly string[]): Promise<ZTaskSpec> {

    const data = new ZTaskBuilder(this);

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
  ): ZOptionImplClass<ZTaskOption, ZTaskBuilder, TArgs> {

    const setup = this.setup;

    class TaskOption extends base implements ZTaskOption {

      constructor(private readonly _builder: ZTaskBuilder, ...args: TArgs) {
        super(...args);
        _builder.moveTo(this);
      }

      get setup(): ZSetup {
        return setup;
      }

      addPre(pre: ZTaskSpec.Pre): void {
        this._builder.finishPre();
        this._builder.pre.push(pre);
      }

      addPreTask(name: string): void {
        this._builder.finishPre();
        this._builder.preTask = name;
      }

      addPreArgs(...args: readonly string[]): void {
        this._builder.addPreArgs(args);
      }

      parallelPre(): void {
        this._builder.finishPre();
        this._builder.preParallel = true;
      }

      addAttr(name: string, value: string): void {
        this._builder.finishPre();
        recordZTaskAttr(this._builder.attrs, name, value);
      }

      addArg(arg: string): void {
        this._builder.args.push(arg);
      }

      setAction(action: ZTaskSpec.Action): void {
        this._builder.action = action;
      }

    }

    return TaskOption;
  }

}

/**
 * @internal
 */
function zTaskCLOptions(): SupportedZOptions<ZTaskBuilder, ZTaskOption> {
  return {

    '--and': readZTaskCommand.bind(undefined, true),
    '--then': readZTaskCommand.bind(undefined, false),

    '-*': readNamedZTaskArg,
    '--*': readNamedZTaskArg,

    './*'(option: ZTaskOption): void {
      option.addPre({ selector: option.name });
      option.values(0);
    },

    '*=*'(option: ZTaskOption): void {

      const { name, setup: { taskParser } } = option;

      if (taskParser.parseAttr(name, (n, v) => !n.includes('/') && option.addAttr(n, v))) {
        option.values(0);
      }
    },

    '/*'(option: ZTaskOption): void {

      const { name } = option;
      const preArg = name.substr(1);

      if (preArg) {
        option.addPreArgs(preArg);
      }
      option.values(0);
    },

    '//*'(option: ZTaskOption): void {
      option.addPreArgs(...option.values().slice(0, -1));
    },

    ','(option: ZTaskOption): void {
      option.parallelPre();
      option.values(0);
    },

    '*'(option: ZTaskOption): void {

      const { name } = option;

      if (name) {
        option.addPreTask(name);
      }
      option.values(0);
    },

  };
}

/**
 * @internal
 */
function readNamedZTaskArg(option: ZTaskOption): void {
  option.addArg(option.name);
  for (const arg of option.values()) {
    option.addArg(arg);
  }
}

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

/**
 * @internal
 */
function zTaskCLPullers(setup: ZSetup): readonly ZOptionSyntax[] {
  return [
    ZOptionSyntax.longOptions,
    ZOptionSyntax.shortOptions,
    zPackageRefSyntax.bind(undefined, setup),
    zTaskAttrSyntax.bind(undefined, setup),
    zTaskPreArgsSyntax,
    parallelZTasksSyntax,
    zTaskPreSyntax,
    xTaskShorthandPreArgSyntax,
    ZOptionSyntax.any,
  ];
}

/**
 * @internal
 */
function zPackageRefSyntax({ taskParser }: ZSetup, args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

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
function zTaskAttrSyntax({ taskParser }: ZSetup, args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

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
function zTaskPreArgsSyntax(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

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
        name: first.substr(0, openingIdx).trim(),
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

    const values = [first.substring(contentIdx, closingIdx), '//'];
    const afterPreArgsIdx = closingIdx + delimiter.length;
    const restArgs = args.slice(1);
    const suffix = first.substr(afterPreArgsIdx).trim();
    const tail = suffix ? [suffix, ...restArgs] : restArgs;

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
function parallelZTasksSyntax(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

  const [entry] = args;
  const [name, ...values] = entry.split(parallelZTaskSep).filter(name => !!name);

  return values.length ? [{ name, values, tail: args.slice(1), retry: true }] : [];
}

/**
 * @internal
 */
function zTaskPreSyntax(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

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
function xTaskShorthandPreArgSyntax(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

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
export class ZTaskBuilder {

  private _option!: ZTaskOption;
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

  moveTo(option: ZTaskOption): void {
    this._option = option;
  }

  addPreArgs(args: readonly string[]): void {
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
