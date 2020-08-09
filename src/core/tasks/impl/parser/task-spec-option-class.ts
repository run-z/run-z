import type { ZOption } from '@run-z/optionz';
import { ZOptionError } from '@run-z/optionz';
import type { ZBatching } from '../../../batches';
import type { ZExecutedProcess, ZTaskExecution } from '../../../jobs';
import type { ZPackage } from '../../../packages';
import type { ZTaskOption } from '../../task-option';
import type { ZTaskSpec } from '../../task-spec';
import type { DraftZTask } from './draft-task';

/**
 * @internal
 */
const zTaskActionsWithArgs: { readonly [action in ZTaskSpec.Action['type']]: 0 | 1 } = {
  command: 1,
  group: 0,
  script: 1,
  unknown: 1,
};

/**
 * @internal
 */
export function zTaskSpecOptionClass<TArgs extends any[]>(
    base: ZOption.BaseClass<TArgs>,
): ZOption.ImplClass<ZTaskOption, DraftZTask, TArgs> {

  class TaskOption extends base implements ZTaskOption {

    readonly taskTarget: ZPackage;
    readonly taskName: string;

    constructor(private readonly _draft: DraftZTask, ...args: TArgs) {
      super(...args);
      this.taskTarget = _draft.builder.taskTarget;
      this.taskName = _draft.builder.taskName;
      _draft.moveTo(this);
    }

    get batching(): ZBatching {
      return this._draft.builder.batching;
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

      const action = this._draft.builder.action;

      if (!action || !zTaskActionsWithArgs[action.type]) {
        throw new ZOptionError(this.optionLocation(), `Unrecognized option: "${args[0]}"`);
      }

      this.pre.conclude();
      this._draft.builder.addArg(...args);

      return this;
    }

    setBatching(batching: ZBatching): this {
      this._draft.builder.setBatching(batching);
      return this;
    }

    setAction(action: ZTaskSpec.Action): this {
      this.pre.conclude();
      this._draft.builder.setAction(action);
      return this;
    }

    executeBy(executor: (this: void, execution: ZTaskExecution) => ZExecutedProcess): this {
      this._draft.builder.executeBy(executor);
      return this;
    }

  }

  return TaskOption;
}
