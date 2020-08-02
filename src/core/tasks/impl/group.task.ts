import { ZOptionInput } from '@run-z/optionz';
import type { ZExecutedProcess } from '../../jobs';
import { noopZExecutedProcess } from '../../jobs/impl';
import type { ZPackageSet } from '../../packages';
import type { ZPrePlanner } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class GroupZTask extends AbstractZTask<ZTaskSpec.Group> {

  async callAsPre(planner: ZPrePlanner, pre: ZTaskSpec.Pre): Promise<void> {

    const { dependent } = planner;
    const [subTaskName, ...subArgs] = pre.args;

    if (!subTaskName || !ZOptionInput.isOptionValue(subTaskName)) {
      return super.callAsPre(planner, pre);
    }

    // There is a sub-task(s) to execute.
    // Call prerequisite. Pass call parameters to sub-task(s) rather then to this prerequisite.
    await dependent.call(this, { params: () => dependent.plannedCall.params() });

    // Delegate to sub-task(s).
    const subTaskRef: ZTaskSpec.Pre = { ...pre, args: subArgs };

    for (const subTarget of await this._subTaskTargets().packages()) {

      const subTask = await subTarget.task(subTaskName);

      await subTask.callAsPre(planner, subTaskRef);

      dependent.order(this, subTask);
    }
  }

  exec(): ZExecutedProcess {
    return noopZExecutedProcess;
  }

  private _subTaskTargets(): ZPackageSet {

    const { target, spec: { action: { targets } } } = this;

    return target.selectTargets(targets);
  }

}
