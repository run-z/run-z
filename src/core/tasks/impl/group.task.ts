import type { ZPackageSet } from '../../packages';
import type { ZCall, ZCallInstruction } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class GroupZTask extends AbstractZTask<ZTaskSpec.Group> {

  async *asDepOf(
      dependent: ZCall,
      dep: ZTaskSpec.TaskRef,
  ): Iterable<ZCallInstruction> | AsyncIterable<ZCallInstruction> {

    const { attrs, args } = dep;
    const [subTaskName, ...subArgs] = args;

    if (subTaskName && !subTaskName.startsWith('-')) {
      // There is a sub-task to execute.

      // Add task dependency. Pass call parameters to sub-task rather to this dependency.
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
      yield* super.asDepOf(dependent, dep);
    }
  }

  exec(): void {
    // Grouping task does nothing
  }

  private _subTaskTargets(): ZPackageSet {

    const { target, spec: { deps } } = this;
    let result: ZPackageSet | undefined;

    for (let i = deps.length - 1; i >= 0; --i) {

      const dep = deps[i];

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
