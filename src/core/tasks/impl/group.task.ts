import { noop } from '@proc7ts/primitives';
import type { ZExecution } from '@run-z/exec-z';
import { execZNoOp } from '@run-z/exec-z';
import { ZOptionError, ZOptionInput } from '@run-z/optionz';
import { ZBatchDetails } from '../../batches';
import type { ZJob } from '../../jobs';
import type { ZCall, ZCallDetails, ZPrePlanner } from '../../plan';
import type { ZTask } from '../task';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class GroupZTask extends AbstractZTask<ZTaskSpec.Group> {

  async callAsPre(planner: ZPrePlanner, pre: ZTaskSpec.Pre, details: ZCallDetails.Full): Promise<ZCall> {

    const { dependent } = planner;
    let subTaskName: string;
    let subArgs: readonly string[];

    if (this.name === pre.task) {
      // Task name is the same as prerequisite one.
      // First argument contains the name of sub-task to call.
      [subTaskName, ...subArgs] = pre.args;
      if (!subTaskName || !ZOptionInput.isOptionValue(subTaskName)) {
        // No sub-task name.

        // Report targets.
        await this._planTargets(
            this.spec.action.targets,
            pre.task,
            {
              ...planner,
              callPre<TAction extends ZTaskSpec.Action>(
                  task: ZTask<TAction>,
                  details?: ZCallDetails<TAction>,
              ): Promise<ZCall> {
                return planner.dependent.call(task, details);
              },
            },
        );

        // Fallback to default implementation.
        return super.callAsPre(planner, pre, details);
      }
    } else {
      // Task name differs from prerequisite one.
      // Prerequisite name is the name of sub-task to call.
      subTaskName = pre.task;
      subArgs = pre.args;
    }

    // There is a sub-task(s) to execute.
    // Call prerequisite. Pass prerequisite parameters to sub-task(s) rather then to this prerequisite.
    const groupCall = await dependent.call(
        this,
        {
          ...details,
          params: evaluator => dependent.plannedCall
              .params(evaluator)
              .extendAttrs(details.params(evaluator)),
        },
    );

    const batching = this._builder.batching.mergeWith(planner.batching);
    const targets = await this._planTargets(
        this.spec.action.targets,
        subTaskName,
        {
          ...planner,
          batching,
          applyTargets: noop,
          callPre<TAction extends ZTaskSpec.Action>(
              task: ZTask<TAction>,
              details?: ZCallDetails<TAction>,
          ): Promise<ZCall> {
            return planner.dependent.call(task, details);
          },
        },
    );

    await batching.batchAll({
      dependent: planner.dependent,
      targets,
      taskName: subTaskName,
      isAnnex: pre.annex,
      batch: <TAction extends ZTaskSpec.Action>(
          subTask: ZTask<TAction>,
          subDetails: ZBatchDetails<TAction> = {},
      ): Promise<ZCall> => {

        const { params, plan, batching } = ZBatchDetails.by(subDetails);

        return subTask.callAsPre<TAction>(
            planner.transient(batching),
            { ...pre, args: subArgs, task: subTask.name },
            {
              params: evaluator => groupCall.params(evaluator).extendAttrs(params(evaluator)),
              plan: async subPlanner => {
                if (!pre.annex) {
                  // Execute sub-tasks after the grouping one
                  subPlanner.order(this, subPlanner.plannedCall.task);
                }
                // Apply task plan
                await details.plan(subPlanner);
                // Apply sub-tasks plan
                return plan(subPlanner);
              },
            },
        );
      },
    });

    return groupCall;
  }

  protected _execTask({ params: { args } }: ZJob): ZExecution {
    if (args.length) {
      throw new ZOptionError(
          {
            args: ['run-z', this.name, ...args],
            index: 2,
          },
          `Unrecognized command line option "${args[0]}" passed to task "${this.name}" in ${this.target.name}`,
      );
    }
    return execZNoOp();
  }

}
