import type { ZOption } from '@run-z/optionz';
import { ZOptionError } from '@run-z/optionz';
import { ZBatching } from '../../../batches/batching.js';
import { ZTaskExecutor } from '../../../jobs/task-executor.js';
import { ZPackage } from '../../../packages/package.js';
import { ZTaskOption } from '../../task-option.js';
import { ZTaskSpec } from '../../task-spec.js';
import { DraftZTask } from './draft-task.js';

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

    readonly #draft: DraftZTask;
    readonly taskTarget: ZPackage;
    readonly taskName: string;

    constructor(draft: DraftZTask, ...args: TArgs) {
      super(...args);
      this.#draft = draft;
      this.taskTarget = draft.builder.taskTarget;
      this.taskName = draft.builder.taskName;
      draft.moveTo(this);
    }

    get action(): ZTaskSpec.Action | undefined {
      return this.#draft.builder.action;
    }

    get batching(): ZBatching {
      return this.#draft.builder.batching;
    }

    get pre(): ZTaskOption.Pre {
      return this.#draft.pre;
    }

    get acceptsArgs(): boolean {
      const action = this.action;

      if (action) {
        return !!zTaskActionsWithArgs[action.type];
      }

      return false;
    }

    addPre(pre: ZTaskSpec.Pre): this {
      this.pre.conclude();
      this.#draft.builder.addPre(pre);

      return this;
    }

    addAttr(name: string, value: string): this {
      this.pre.conclude();
      this.#draft.builder.addAttr(name, value);

      return this;
    }

    addAttrs(attrs: ZTaskSpec.Attrs): this {
      this.pre.conclude();
      this.#draft.builder.addAttrs(attrs);

      return this;
    }

    removeAttr(name: string): this {
      this.pre.conclude();
      this.#draft.builder.removeAttr(name);

      return this;
    }

    addArg(...args: string[]): this {
      if (!args.length) {
        return this;
      }
      if (!this.acceptsArgs) {
        throw new ZOptionError(this.optionLocation(), `Unrecognized option: "${args[0]}"`);
      }

      this.pre.conclude();
      this.#draft.builder.addArg(...args);

      return this;
    }

    setBatching(batching: ZBatching): this {
      this.#draft.builder.setBatching(batching);

      return this;
    }

    setAction(action: ZTaskSpec.Action): this {
      this.pre.conclude();
      this.#draft.builder.setAction(action);

      return this;
    }

    executeBy(executor: ZTaskExecutor): this {
      this.#draft.builder.executeBy(executor);

      return this;
    }

}

  return TaskOption;
}
