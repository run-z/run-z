import type { ZOption } from '@run-z/optionz';
import { ZOptionError } from '@run-z/optionz';
import type { ZBatcher } from '../../../batches';
import type { ZPackage } from '../../../packages';
import type { ZTaskOption } from '../../task-option';
import type { ZTaskSpec } from '../../task-spec';
import type { DraftZTask } from './draft-task';

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
        throw new ZOptionError(this.optionLocation(), `Unrecognized option: "${args[0]}"`);
      }
      this.pre.conclude();
      this._draft.builder.addArg(...args);
      return this;
    }

    setBatcher(batcher: ZBatcher): this {
      this._draft.builder.setBatcher(batcher);
      return this;
    }

    setAction(action: ZTaskSpec.Action): this {
      this.pre.conclude();
      this._draft.builder.setAction(action);
      return this;
    }

  }

  return TaskOption;
}
