import { ZOptionInput } from '@run-z/optionz';
import type { ZPackageSet } from '../../packages';
import type { ZPrePlanner } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class GroupZTask extends AbstractZTask<ZTaskSpec.Group> {

  async callAsPre(planner: ZPrePlanner, ref: ZTaskSpec.TaskRef): Promise<void> {

    const { dependent } = planner;
    const [subTaskName, ...subArgs] = ref.args;

    if (!subTaskName || !ZOptionInput.isOptionValue(subTaskName)) {
      return super.callAsPre(planner, ref);
    }

    // There is a sub-task(s) to execute.
    // Call prerequisite. Pass call parameters to sub-task(s) rather then to this prerequisite.
    await dependent.call(this, { params: () => dependent.plannedCall.params() });

    // Delegate to sub-task(s).
    const subTaskRef: ZTaskSpec.TaskRef = { ...ref, args: subArgs };

    for (const subTarget of await this._subTaskTargets().packages()) {

      const subTask = await subTarget.task(subTaskName);

      await subTask.callAsPre(planner, subTaskRef);

      dependent.order(this, subTask);
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
