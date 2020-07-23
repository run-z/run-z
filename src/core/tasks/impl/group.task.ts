import type { ZPackageSet } from '../../packages';
import type { ZCall, ZCallInstruction } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class GroupZTask extends AbstractZTask<ZTaskSpec.Group> {

  async *asPre(
      dependent: ZCall,
      ref: ZTaskSpec.TaskRef,
  ): Iterable<ZCallInstruction> | AsyncIterable<ZCallInstruction> {

    const { attrs, args } = ref;
    const [subTaskName, ...subArgs] = args;

    if (subTaskName && !subTaskName.startsWith('-')) {
      // There is a sub-task to execute.

      // Add task prerequisite. Pass call parameters to sub-task rather to this prerequisite.
      yield {
        task: this,
        params: () => dependent.params(),
      };

      // Delegate to sub-task.
      const subTaskParams = dependent.extendParams({ attrs, args: subArgs });

      for await (const target of this._subTaskTargets().packages()) {

        const subTask = target.task(subTaskName);

        yield {
          task: subTask,
          params: subTaskParams,
        };
      }
    } else {
      yield* super.asPre(dependent, ref);
    }
  }

  exec(): void {
    // Grouping task does nothing
  }

  private _subTaskTargets(): ZPackageSet {

    const { target, spec: { pre } } = this;
    let result: ZPackageSet | undefined;

    for (let i = pre.length - 1; i >= 0; --i) {

      const dep = pre[i];

      if (dep.selector) {

        const selected = target.select(dep.selector);

        result = result ? selected.andPackages(result) : selected;
      } else if (result) {
        break;
      }
    }

    return result || target;
  }

}
