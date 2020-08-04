import type { ZExecutedProcess, ZTaskExecution } from '../../jobs';
import type { ZPackage } from '../../packages';
import type { ZCall, ZCallDetails, ZCallPlanner, ZPrePlanner, ZTaskParams } from '../../plan';
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
  readonly callDetails: Required<ZCallDetails<TAction>>;

  constructor(private readonly _builder: ZTaskBuilder$, readonly spec: ZTaskSpec<TAction>) {
    this.target = _builder.target;
    this.taskQN = this.name = _builder.name;
    this.callDetails = {
      params: this.callParams.bind(this),
      plan: this.planCall.bind(this),
    };
  }

  async callAsPre(
      planner: ZPrePlanner,
      { attrs, args }: ZTaskSpec.Pre,
      details: ZCallDetails,
  ): Promise<void> {

    const taskParams = planner.dependent.plannedCall.extendParams({ attrs, args });

    await planner.callPre(
        this,
        {
          params: () => taskParams().extend(details?.params?.()),
          plan: details?.plan?.bind(details),
        },
    );
  }

  call(details?: ZCallDetails<TAction>): Promise<ZCall> {
    return this.target.setup.planner.call(this, details);
  }

  abstract exec(execution: ZTaskExecution<TAction>): ZExecutedProcess;

  /**
   * Builds initial task execution parameters.
   *
   * @returns Partial task execution parameters.
   */
  protected callParams(): ZTaskParams.Partial {

    const { spec: { attrs, args } } = this;

    return { attrs, args };
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
  protected async planCall(planner: ZCallPlanner<TAction>): Promise<void> {
    await this.planPre(planner);
  }

  protected async planPre(planner: ZCallPlanner<TAction>): Promise<void> {

    const batcher = this._builder._batcher;
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
        batcher,
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
      };

      const preTargets = target.selectTargets(pre.targets);

      for (const preTarget of await preTargets.packages()) {
        await batcher({
          dependent: planner,
          target: preTarget,
          taskName: pre.task,
          batch(preTask, preDetails = {}) {
            return preTask.callAsPre(prePlanner, pre, preDetails);
          },
        });
      }

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

    if (this.isParallel()) {
      parallel.push(this);
    }
    planner.makeParallel(parallel);
  }

  /**
   * Whether this task can be called in parallel to its prerequisites.
   */
  protected isParallel(): boolean {
    return false;
  }

}
