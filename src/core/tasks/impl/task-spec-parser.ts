import { thruIt } from '@proc7ts/a-iterable';
import { nextSkip } from '@proc7ts/call-thru';
import { arrayOfElements, valueByRecipe } from '@proc7ts/primitives';
import type { ZOption, ZOptionsParser } from '@run-z/optionz';
import { customZOptionsParser, SupportedZOptions, ZOptionInput, ZOptionSyntax } from '@run-z/optionz';
import type { ZPackage } from '../../packages';
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

        readonly taskTarget: ZPackage;
        readonly taskName: string;

        constructor(private readonly _draft: DraftZTask, ...args: TArgs) {
          super(...args);
          this.taskTarget = _draft.builder.target;
          this.taskName = _draft.builder.name;
          _draft.moveTo(this);
        }

        get pre(): ZTaskOption.Pre {
          return this._draft.pre;
        }

        addPre(pre: ZTaskSpec.Pre): this {
          this.pre.conclude();
          this._draft.builder.addPre(pre);
          return this;
        }

        addAttr(name: string, value: string): this {
          this.pre.conclude();
          this._draft.builder.addAttr(name, value);
          return this;
        }

        addAttrs(attrs: ZTaskSpec.Attrs): this {
          this.pre.conclude();
          this._draft.builder.addAttrs(attrs);
          return this;
        }

        addArg(...args: string[]): this {
          if (!args.length) {
            return this;
          }
          if (!this._draft.builder.action) {
            this._draft.parseError(`Unrecognized option: "${args[0]}"`);
          }
          this.pre.conclude();
          this._draft.builder.addArg(...args);
          return this;
        }

        setAction(action: ZTaskSpec.Action): this {
          this.pre.conclude();
          this._draft.builder.setAction(action);
          return this;
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

  '--*=*': readNameValueZTaskArg,
  '-*=*': readNameValueZTaskArg,

  '--*': readNamedZTaskArg,
  '-*': readNamedZTaskArg,

  './*'(option: ZTaskOption): void {
    option.pre.nextTarget({ selector: option.name });
    option.values(0);
  },

  '*=*'(option: ZTaskOption): void {

    const { name, taskTarget: { setup: { taskParser } } } = option;

    if (taskParser.parseAttr(name, (n, v) => !n.includes('/') && !!option.addAttr(n, v))) {
      option.values(0);
    }
  },

  '/*'(option: ZTaskOption): void {

    const { name } = option;
    const preOption = name.substr(1);

    if (preOption) {
      option.pre.addOption(preOption);
    }
    option.values(0);
  },

  '//*'(option: ZTaskOption): void {
    option.values().slice(0, -1).forEach(preOption => option.pre.addOption(preOption));
  },

  ','(option: ZTaskOption): void {
    option.pre.parallelToNext();
    option.values(0);
  },

  '*'(option: ZTaskOption): void {

    const { name } = option;

    if (name) {
      option.pre.start(name);
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
function readNameValueZTaskArg(option: ZTaskOption): void {

  const [value] = option.values(1);
  const arg = `${option.name}=${value}`;

  if (option.pre.isStarted) {
    option.pre.addArg(arg);
  } else {
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
  private _nextTargets: ZTaskSpec.Target[];
  readonly pre: ZTaskOption.Pre;
  preParallel = false;

  constructor(readonly builder: ZTaskBuilder) {

    const { action: prevAction } = builder.spec();

    this._nextTargets = prevAction.type === 'group' ? [...prevAction.targets] : [];

    const draft = this;

    let preTargets: readonly ZTaskSpec.Target[] = [];
    let parallelPre = false;
    let preTaskName: string | undefined;
    let preOptionAt = -1;
    let preAttrs: Record<string, [string, ...string[]]> = {};
    let preArgs: string[] = [];

    const addPreOption = (): void => {
      if (preOptionAt < 0) {
        preOptionAt = this._option.argIndex;
      }
    };

    this.pre = {
      get isStarted() {
        return this.taskName != null;
      },
      get taskName() {
        return preTaskName;
      },
      start(taskName: string) {
        this.conclude();
        if (draft._nextTargets.length) {
          preTargets = draft._nextTargets;
          draft._nextTargets = [];
        }
        preTaskName = taskName;
        return this;
      },
      addAttr(name: string, value: string) {
        addPreOption();
        addZTaskAttr(preAttrs, name, value);
        return this;
      },
      addAttrs(attrs: ZTaskSpec.Attrs) {
        addPreOption();
        addZTaskAttrs(preAttrs, attrs);
        return this;
      },
      addArg(...args: readonly string[]) {
        addPreOption();
        preArgs.push(...args);
        return this;
      },
      addOption(value: string) {
        addPreOption();

        const { taskParser } = draft._option.taskTarget.setup;

        if (!taskParser.parseAttr(value, (name, value) => !!this.addAttr(name, value))) {
          this.addArg(value);
        }

        return this;
      },
      parallelToNext(): void {
        this.conclude();
        parallelPre = true;
      },
      nextTarget(...targets: ZTaskSpec.Target[]) {
        this.conclude();
        draft._nextTargets.push(...targets);
      },
      conclude(): ZTaskSpec.Pre | undefined {
        if (this.taskName != null) {

          const pre: ZTaskSpec.Pre = {
            targets: preTargets,
            task: this.taskName,
            parallel: parallelPre,
            attrs: preAttrs,
            args: preArgs,
          };

          preTaskName = undefined;
          parallelPre = false;
          preOptionAt = -1;
          preAttrs = {};
          preArgs = [];

          draft._option.addPre(pre);

          return pre;
        }

        if (preOptionAt >= 0) {
          draft.parseError('Prerequisite arguments specified, but not the task', preOptionAt);
        }

        return;
      },
    };
  }

  moveTo(option: ZTaskOption): void {
    this._option = option;
  }

  parseError(message: string, argIndex = this._option.argIndex): never {

    const { args } = this._option;
    let position = 0;
    let reconstructedCmd = '';

    for (let i = 0; i < args.length; ++i) {
      if (reconstructedCmd) {
        reconstructedCmd += ' ';
      }

      const arg = args[i];

      if (i === argIndex) {
        position = reconstructedCmd.length;
      }

      reconstructedCmd += arg;
    }

    throw new InvalidZTaskError(message, reconstructedCmd, position);
  }

  done(): ZTaskBuilder {

    const lastSpec = this.pre.conclude();

    if (!this.builder.action) {

      let targets: readonly ZTaskSpec.Target[] = this._nextTargets;

      if (!targets.length && lastSpec) {
        targets = lastSpec.targets;
      }

      this.builder.setAction({
        type: 'group',
        targets,
      });
    }
    return this.builder;
  }

}

/**
 * @internal
 */
export function addZTaskAttr(target: Record<string, string[]>, name: string, value: string): void {
  if (target[name]) {
    target[name].push(value);
  } else {
    target[name] = [value];
  }
}

/**
 * @internal
 */
export function addZTaskAttrs(target: Record<string, string[]>, attrs: ZTaskSpec.Attrs): void {
  Object.entries(attrs).forEach(
      ([name, values]) => values?.forEach(
          value => addZTaskAttr(target, name, value),
      ),
  );
}
