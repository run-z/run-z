import { ZBatchDetails } from '../../batches';
import type { ZExecutedProcess, ZTaskExecution } from '../../jobs';
import { execNoopZProcess } from '../../jobs/impl';
import type { ZPackage } from '../../packages';
import type { ZCall, ZCallPlanner, ZPrePlanner } from '../../plan';
import { ZCallDetails, ZTaskParams } from '../../plan';
import type { ZTask, ZTaskQualifier } from '../task';
import type { ZTaskBuilder$ } from '../task-builder.impl';
import type { ZTaskSpec } from '../task-spec';

/**
 * @internal
 */
export abstract class AbstractZTask<TAction extends ZTaskSpec.Action> implements ZTask<TAction> {

  readonly target: ZPackage;
  readonly name: string;
  readonly taskQN: string;
  readonly callDetails: ZCallDetails.Full<TAction>;

  constructor(protected readonly _builder: ZTaskBuilder$, readonly spec: ZTaskSpec<TAction>) {
    this.target = _builder.taskTarget;
    this.taskQN = this.name = _builder.taskName;
    this.callDetails = {
      params: this._callParams.bind(this),
      plan: this._planCall.bind(this),
    };
  }

  async callAsPre(
      planner: ZPrePlanner,
      { attrs, args }: ZTaskSpec.Pre,
      details: ZCallDetails.Full,
  ): Promise<ZCall> {

    const taskParams = planner.dependent.plannedCall.extendParams({ attrs, args });

    return planner.callPre(
        this,
        {
          ...details,
          params: () => taskParams().extend(details.params()),
        },
    );
  }

  call(details?: ZCallDetails<TAction>): Promise<ZCall> {
    return this.target.setup.planner.call(this, details);
  }

  exec(execution: ZTaskExecution<TAction>): ZExecutedProcess {

    const executor = this._builder.executor;

    if (executor) {
      // Overridden executor
      return executor(execution);
    }

    if (execution.call.params().flag('skip')) {
      // Skip execution
      return execNoopZProcess();
    }

    // Normal execution
    return this._execTask(execution);
  }

  /**
   * Builds initial task execution parameters.
   *
   * @returns Partial task execution parameters.
   */
  protected _callParams(): ZTaskParams {

    const { spec: { attrs, args } } = this;

    return new ZTaskParams({ attrs, args });
  }

  /**
   * Plans this task execution.
   *
   * Records initial task execution instructions.
   *
   * @param planner  Task execution planner to record instructions to.
   *
   * @returns Either nothing when instructions recorded synchronously, or a promise-like instance resolved when
   * instructions recorded asynchronously.
   */
  protected async _planCall(planner: ZCallPlanner<TAction>): Promise<void> {
    await this._planPre(planner);
  }

  private async _planPre(planner: ZCallPlanner<TAction>): Promise<void> {

    const batching = this._builder.batching;
    const { target, spec } = this;
    let parallel: ZTaskQualifier[] = [];
    let prevTasks: ZTask[] = [];

    for (const pre of spec.pre) {
      if (!pre.parallel) {
        planner.makeParallel(parallel);
        parallel = [];
      }

      const calledTasks: ZTask[] = [];
      const prePlanner: ZPrePlanner = {
        dependent: planner,
        batching,
        async callPre<TAction extends ZTaskSpec.Action>(
            task: ZTask<TAction>,
            details?: ZCallDetails<TAction>,
        ): Promise<ZCall> {

          const preCall = await planner.call(task, details);
          const preTask = preCall.task;

          calledTasks.push(preTask);
          for (const prevTask of prevTasks) {
            planner.order(prevTask, preTask);
          }

          return preCall;
        },
        transient(newBatching) {
          return { ...this, batching: batching.mergeWithTransient(newBatching) };
        },
      };

      const preTargets = target.selectTargets(pre.targets);

      await batching.batchAll({
        dependent: planner,
        targets: preTargets,
        taskName: pre.task,
        batch(preTask, preDetails) {

          const batchDetails = ZBatchDetails.by(preDetails);

          return preTask.callAsPre(
              prePlanner.transient(batchDetails.batching),
              pre,
              batchDetails,
          );
        },
      });

      if (calledTasks.length === 1) {
        parallel.push(calledTasks[0]);
      } else {

        const qualifier: ZTaskQualifier = {
          taskQN: `${String(preTargets)} */${pre.task}`,
        };

        parallel.push(qualifier);
        for (const calledTask of calledTasks) {
          planner.qualify(calledTask, qualifier);
        }
      }

      prevTasks = calledTasks;
    }

    for (const prevTask of prevTasks) {
      planner.order(prevTask, this);
    }

    if (this._isParallel()) {
      parallel.push(this);
    }
    planner.makeParallel(parallel);
  }

  /**
   * Whether this task can be called in parallel to its prerequisites.
   */
  protected _isParallel(): boolean {
    return false;
  }

  protected abstract _execTask(execution: ZTaskExecution<TAction>): ZExecutedProcess;

}
