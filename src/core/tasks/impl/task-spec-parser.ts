import { thruIt } from '@proc7ts/a-iterable';
import { nextSkip } from '@proc7ts/call-thru';
import { arrayOfElements, valueByRecipe } from '@proc7ts/primitives';
import type { ZOption, ZOptionsParser } from '@run-z/optionz';
import { customZOptionsParser, SupportedZOptions, ZOptionInput, ZOptionSyntax } from '@run-z/optionz';
import type { ZSetup } from '../../setup';
import { InvalidZTaskError } from '../invalid-task-error';
import type { ZTaskBuilder } from '../task-builder';
import type { ZTaskOption } from '../task-option';
import type { ZTaskParser } from '../task-parser';
import type { ZTaskSpec } from '../task-spec';

/**
 * @internal
 */
export function zTaskSpecParser(
    setup: ZSetup,
    { options }: ZTaskParser.Config,
): (
    this: void,
    builder: ZTaskBuilder,
    entries: readonly string[],
    fromIndex?: number,
) => Promise<ZTaskBuilder> {

  const parser: ZOptionsParser<DraftZTask> = customZOptionsParser({
    options: zTaskSpecOptions(options),
    syntax: zTaskSpecSyntax(setup),
    optionClass<TArgs extends any[]>(
        base: ZOption.BaseClass<TArgs>,
    ): ZOption.ImplClass<ZTaskOption, DraftZTask, TArgs> {

      class TaskOption extends base implements ZTaskOption {

        constructor(private readonly _draft: DraftZTask, ...args: TArgs) {
          super(...args);
          _draft.moveTo(this);
        }

        get setup(): ZSetup {
          return setup;
        }

        addPre(pre: ZTaskSpec.Pre): void {
          this._draft.finishPre();
          this._draft.builder.addPre(pre);
        }

        addPreTask(name: string): void {
          this._draft.finishPre();
          this._draft.preTask = name;
        }

        addPreArgs(...args: readonly string[]): void {
          this._draft.addPreArgs(args);
        }

        parallelPre(): void {
          this._draft.finishPre();
          this._draft.preParallel = true;
        }

        addAttr(name: string, value: string): void {
          this._draft.finishPre();
          this._draft.builder.addAttr(name, value);
        }

        addAttrs(attrs: ZTaskSpec.Attrs): void {
          this._draft.finishPre();
          this._draft.builder.addAttrs(attrs);
        }

        addArg(...args: string[]): void {
          this._draft.finishPre();
          this._draft.builder.addArg(...args);
        }

        setAction(action: ZTaskSpec.Action): void {
          this._draft.finishPre();
          this._draft.builder.setAction(action);
        }

      }

      return TaskOption;
    },
  });

  return (builder, entries, fromIndex = 0) => parser(
      new DraftZTask(builder),
      entries,
      fromIndex,
  ).then(builder => builder.done());
}

/**
 * @internal
 */
const defaultZTaskSpecOptions: SupportedZOptions.Map<ZTaskOption> = {

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

/**
 * @internal
 */
function zTaskSpecOptions(
    options: ZTaskParser.SupportedOptions = [],
): SupportedZOptions<ZTaskOption, DraftZTask> {

  const providers: SupportedZOptions.Provider<ZTaskOption, DraftZTask>[] = arrayOfElements(options)
      .map(o => ({ builder }) => valueByRecipe(o, builder));

  return [defaultZTaskSpecOptions, ...providers];
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
function zTaskSpecSyntax(setup: ZSetup): readonly ZOptionSyntax[] {
  return [
    ZOptionSyntax.longOptions,
    ZOptionSyntax.shortOptions,
    zPackageRefSyntax.bind(undefined, setup),
    zTaskAttrSyntax.bind(undefined, setup),
    zTaskPreArgsSyntax,
    parallelZTasksSyntax,
    zTaskPreSyntax,
    zTaskShorthandPreArgSyntax,
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
function zTaskShorthandPreArgSyntax(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

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
export class DraftZTask {

  private _option!: ZTaskOption;
  preTask: string | undefined;
  preParallel = false;
  private _preArgs: string[] = [];
  private _preArgsAt = 0;

  constructor(readonly builder: ZTaskBuilder) {
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
      this.builder.addPre(createZTaskRef(
          this._option.setup.taskParser,
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

  done(): ZTaskBuilder {
    this.finishPre();
    return this.builder;
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

  return { task, parallel, attrs, args };
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
