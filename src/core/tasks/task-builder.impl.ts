import type { ZOptionsParser } from '@run-z/optionz';
import { ZBatching } from '../batches/batching.js';
import { ZTaskExecutor } from '../jobs/task-executor.js';
import { ZPackage } from '../packages/package.js';
import { AbstractZTask } from './impl/abstract.task.js';
import { CommandZTask } from './impl/command.task.js';
import { GroupZTask } from './impl/group.task.js';
import { ScriptZTask } from './impl/script.task.js';
import { UnknownZTask } from './impl/unknown.task.js';
import { ZTaskBuilder } from './task-builder.js';
import { ZTaskOption } from './task-option.js';
import { addZTaskAttr, addZTaskAttrs, removeZTaskAttr } from './task-spec.impl.js';
import { ZTaskSpec } from './task-spec.js';

/**
 * @internal
 */
export class ZTaskBuilder$<TAction extends ZTaskSpec.Action = ZTaskSpec.Action>
  implements ZTaskBuilder<TAction>
{
  batching: ZBatching = ZBatching.newBatching();
  #executor?: ZTaskExecutor | undefined;
  readonly #commandLine: string[] = [];
  readonly #pre: ZTaskSpec.Pre[] = [];
  readonly #attrs: Record<string, [string, ...string[]] | null> = {};
  readonly #args: string[] = [];
  #action?: ZTaskSpec.Action | undefined;

  constructor(
    readonly taskTarget: ZPackage,
    readonly taskName: string,
  ) {}

  get action(): TAction | undefined {
    return this.#action as TAction;
  }

  get executor(): ZTaskExecutor | undefined {
    return this.#executor;
  }

  addPre(pre: ZTaskSpec.Pre): this {
    this.#pre.push(pre);

    return this;
  }

  addAttr(name: string, value: string): this {
    addZTaskAttr(this.#attrs, name, value);

    return this;
  }

  addAttrs(attrs: ZTaskSpec.Attrs): this {
    addZTaskAttrs(this.#attrs, attrs);

    return this;
  }

  removeAttr(name: string): this {
    removeZTaskAttr(this.#attrs, name);

    return this;
  }

  addArg(...args: string[]): this {
    this.#args.push(...args);

    return this;
  }

  setBatching(batching: ZBatching): this {
    this.batching = batching;

    return this;
  }

  setAction<TNewAction extends ZTaskSpec.Action>(action: TNewAction): ZTaskBuilder$<TNewAction> {
    this.#action = action;

    return this as ZTaskBuilder$<any>;
  }

  executeBy(executor: ZTaskExecutor): this {
    this.#executor = executor;

    return this;
  }

  async parse(
    commandLine: string,
    { fromIndex = 1, ...opts }: ZOptionsParser.Opts<ZTaskOption> = {},
  ): Promise<this> {
    const args = this.taskTarget.setup.taskParser.parseCommandLine(commandLine, { script: true });

    if (!args || args[0] !== 'run-z') {
      const [command, ...rest] = args || [];

      this.setAction({
        type: 'script',
        command,
        args: rest,
      });

      return this;
    }

    return this.applyOptions(args, { ...opts, fromIndex });
  }

  async applyOptions(
    args: readonly string[],
    { fromIndex = 0, ...opts }: ZOptionsParser.Opts<ZTaskOption> = {},
  ): Promise<this> {
    const prevLength = this.#commandLine.length;

    this.#commandLine.push(...args);

    await this.taskTarget.setup.taskParser.applyOptions(this, this.#commandLine, {
      ...opts,
      fromIndex: prevLength + fromIndex,
    });

    return this;
  }

  async applyArgv(
    taskName: string | undefined,
    argv: readonly string[],
    { fromIndex = 2, ...opts }: ZOptionsParser.Opts<ZTaskOption> = {},
  ): Promise<this> {
    if (!taskName) {
      // Task name is unknown
      return this.applyOptions(argv, { ...opts, fromIndex });
    }

    const script = this.taskTarget.packageJson.scripts?.[taskName];

    if (!script) {
      // No such script
      return this.applyOptions(argv, { ...opts, fromIndex });
    }

    const args = this.taskTarget.setup.taskParser.parseCommandLine(script);

    // Consider the first script argument is either `run-z` or something acceptable
    if (!args || args.length - 1 > argv.length - fromIndex) {
      return this.applyOptions(argv, { ...opts, fromIndex });
    }

    // Ensure the script is a prefix of the process command line
    for (let i = 1; i < args.length; ++i) {
      if (args[i] !== argv[i - 1 + fromIndex]) {
        // Script is not a prefix of process command line
        return this.applyOptions(argv, { ...opts, fromIndex });
      }
    }

    // Replace matching args prefix with corresponding task
    return this.applyOptions([taskName, ...argv.slice(args.length - 1 + fromIndex)], {
      ...opts,
      fromIndex: 0,
    });
  }

  spec(): ZTaskSpec<TAction> {
    return {
      pre: this.#pre,
      attrs: this.#attrs,
      args: this.#args,
      action: this.#action || { type: 'group', targets: [] },
    } as ZTaskSpec<any>;
  }

  task(): AbstractZTask<TAction> {
    const spec: ZTaskSpec = this.spec();

    switch (spec.action.type) {
      case 'command':
        return new CommandZTask(this, spec as ZTaskSpec<ZTaskSpec.Command>) as AbstractZTask<any>;
      case 'group':
        return new GroupZTask(this, spec as ZTaskSpec<ZTaskSpec.Group>) as AbstractZTask<any>;
      case 'script':
        return new ScriptZTask(this, spec as ZTaskSpec<ZTaskSpec.Script>) as AbstractZTask<any>;
      case 'unknown':
      default:
        return new UnknownZTask(this, spec) as AbstractZTask<any>;
    }
  }
}
