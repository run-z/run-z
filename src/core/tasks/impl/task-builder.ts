import type { ZPackage } from '../../packages';
import type { ZTaskBuilder } from '../task-builder';
import { ZTaskSpec } from '../task-spec';
import type { AbstractZTask } from './abstract.task';
import { CommandZTask } from './command.task';
import { GroupZTask } from './group.task';
import { ScriptZTask } from './script.task';
import { recordZTaskAttr } from './task-spec-parser';
import { UnknownZTask } from './unknown.task';

/**
 * @internal
 */
export class ZTaskBuilder$<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> implements ZTaskBuilder<TAction> {

  private readonly _pre: ZTaskSpec.Pre[] = [];
  private readonly _attrs: Record<string, [string, ...string[]]> = {};
  private readonly _args: string[] = [];
  private _action?: ZTaskSpec.Action;

  constructor(readonly target: ZPackage, readonly name: string) {
  }

  get action(): TAction | undefined {
    return this._action as TAction;
  }

  addPre(pre: ZTaskSpec.Pre): this {
    this._pre.push(pre);
    return this;
  }

  addAttr(name: string, value: string): this {
    recordZTaskAttr(this._attrs, name, value);
    return this;
  }

  addAttrs(attrs: ZTaskSpec.Attrs): this {
    Object.entries(attrs).forEach(
        ([name, values]) => values?.forEach(
            value => this.addAttr(name, value),
        ),
    );
    return this;
  }

  addArg(...args: string[]): this {
    this._args.push(...args);
    return this;
  }

  setAction<TNewAction extends ZTaskSpec.Action>(action: TNewAction): ZTaskBuilder$<TNewAction> {
    this._action = action;
    return this as ZTaskBuilder$<any>;
  }

  async parse(commandLine: string): Promise<this> {
    await this.target.setup.taskParser.parse(this, commandLine);
    return this;
  }

  async applyOptions(args: readonly string[], fromIndex?: number): Promise<this> {
    await this.target.setup.taskParser.applyOptions(this, args, fromIndex);
    return this;
  }

  spec(): ZTaskSpec<TAction> {
    return {
      pre: this._pre,
      attrs: this._attrs,
      args: this._args,
      action: this._action || ZTaskSpec.groupAction,
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
