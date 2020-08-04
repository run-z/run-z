import { ZOptionInput } from '@run-z/optionz';
import type { ZExecutedProcess } from '../../jobs';
import { noopZExecutedProcess } from '../../jobs/impl';
import type { ZPackageSet } from '../../packages';
import type { ZCallDetails, ZPrePlanner } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class GroupZTask extends AbstractZTask<ZTaskSpec.Group> {

  async callAsPre(planner: ZPrePlanner, pre: ZTaskSpec.Pre, details: ZCallDetails.Full): Promise<void> {

    const { dependent } = planner;
    const [subTaskName, ...subArgs] = pre.args;

    if (!subTaskName || !ZOptionInput.isOptionValue(subTaskName)) {
      return super.callAsPre(planner, pre, details);
    }

    // There is a sub-task(s) to execute.
    // Call prerequisite. Pass call parameters to sub-task(s) rather then to this prerequisite.
    await dependent.call(
        this,
        {
          ...details,
          params: () => dependent.plannedCall.params().extend(details.params()),
        },
    );

    const { batcher } = planner;

    // Delegate to sub-task(s).
    const subTaskPre: ZTaskSpec.Pre = { ...pre, args: subArgs };

    for (const subTarget of await this._subTaskTargets().packages()) {
      await batcher({
        dependent: planner.dependent,
        target: subTarget,
        taskName: subTaskName,
        batch: (subTask, subDetails = {}) => subTask.callAsPre(
            planner,
            subTaskPre,
            {
              params: () => details.params().extend(subDetails.params?.()),
              plan: async subPlanner => {
                // Execute sub-tasks after the grouping one
                subPlanner.order(this, subPlanner.plannedCall.task);
                // Apply task plan
                await details.plan(subPlanner);
                // Apply sub-tasks plan
                return subDetails.plan?.(subPlanner);
              },
            },
        ),
      });
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
