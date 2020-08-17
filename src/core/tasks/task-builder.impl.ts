import type { ZOptionsParser } from '@run-z/optionz';
import { ZBatching } from '../batches';
import type { ZTaskExecutor } from '../jobs';
import type { ZPackage } from '../packages';
import type { AbstractZTask } from './impl';
import { CommandZTask, GroupZTask, ScriptZTask, UnknownZTask } from './impl';
import type { ZTaskBuilder } from './task-builder';
import type { ZTaskOption } from './task-option';
import { ZTaskSpec } from './task-spec';
import { addZTaskAttr, addZTaskAttrs } from './task-spec.impl';

/**
 * @internal
 */
export class ZTaskBuilder$<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> implements ZTaskBuilder<TAction> {

  batching: ZBatching = ZBatching.newBatching();
  private _executor?: ZTaskExecutor;
  private readonly _commandLine: string[] = [];
  private readonly _pre: ZTaskSpec.Pre[] = [];
  private readonly _attrs: Record<string, [string, ...string[]]> = {};
  private readonly _args: string[] = [];
  private _action?: ZTaskSpec.Action;

  constructor(readonly taskTarget: ZPackage, readonly taskName: string) {
  }

  get action(): TAction | undefined {
    return this._action as TAction;
  }

  get executor(): ZTaskExecutor | undefined {
    return this._executor;
  }

  addPre(pre: ZTaskSpec.Pre): this {
    this._pre.push(pre);
    return this;
  }

  addAttr(name: string, value: string): this {
    addZTaskAttr(this._attrs, name, value);
    return this;
  }

  addAttrs(attrs: ZTaskSpec.Attrs): this {
    addZTaskAttrs(this._attrs, attrs);
    return this;
  }

  addArg(...args: string[]): this {
    this._args.push(...args);
    return this;
  }

  setBatching(batching: ZBatching): this {
    this.batching = batching;
    return this;
  }

  setAction<TNewAction extends ZTaskSpec.Action>(action: TNewAction): ZTaskBuilder$<TNewAction> {
    this._action = action;
    return this as ZTaskBuilder$<any>;
  }

  executeBy(executor: ZTaskExecutor): this {
    this._executor = executor;
    return this;
  }

  async parse(
      commandLine: string,
      {
        fromIndex = 1,
        ...opts
      }: ZOptionsParser.Opts<ZTaskOption> = {},
  ): Promise<this> {

    const args = this.taskTarget.setup.taskParser.parseCommandLine(commandLine);

    if (!args) {
      this.setAction(ZTaskSpec.scriptAction);
      return this;
    }

    return this.applyOptions(args, { ...opts, fromIndex });
  }

  async applyOptions(
      args: readonly string[],
      {
        fromIndex = 0,
        ...opts
      }: ZOptionsParser.Opts<ZTaskOption> = {},
  ): Promise<this> {

    const prevLength = this._commandLine.length;

    this._commandLine.push(...args);

    await this.taskTarget.setup.taskParser.applyOptions(
        this,
        this._commandLine,
        {
          ...opts,
          fromIndex: prevLength + fromIndex,
        },
    );

    return this;
  }

  async applyArgv(
      taskName: string | undefined,
      argv: readonly string[],
      {
        fromIndex = 2,
        ...opts
      }: ZOptionsParser.Opts<ZTaskOption> = {},
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

    // Apply script options first
    await this.applyOptions(args, { ...opts, fromIndex: 1 });

    // Then apply explicit options
    return this.applyOptions(argv, { ...opts, fromIndex: args.length - 1 + fromIndex });
  }

  spec(): ZTaskSpec<TAction> {
    return {
      pre: this._pre,
      attrs: this._attrs,
      args: this._args,
      action: this._action || { type: 'group', targets: [] },
    } as ZTaskSpec<any>;
  }

  task(): AbstractZTask<TAction> {

    const spec: ZTaskSpec<any> = this.spec();

    switch (spec.action.type) {
    case 'command':
      return new CommandZTask(this, spec) as AbstractZTask<any>;
    case 'group':
      return new GroupZTask(this, spec) as AbstractZTask<any>;
    case 'script':
      return new ScriptZTask(this, spec) as AbstractZTask<any>;
    case 'unknown':
    default:
      return new UnknownZTask(this, spec) as AbstractZTask<any>;
    }
  }

}

