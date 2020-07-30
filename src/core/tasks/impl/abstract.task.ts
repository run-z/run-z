import { mapIt } from '@proc7ts/a-iterable';
import type { ZPackage, ZPackageSet } from '../../packages';
import type { ZCall, ZCallDetails, ZCallPlanner, ZTaskParams } from '../../plan';
import type { ZTaskExecution } from '../../plan/task-execution';
import type { ZTask, ZTaskQualifier } from '../task';
import type { ZTaskSpec } from '../task-spec';
import type { ZTaskBuilder$ } from './task-builder';

/**
 * @internal
 */
export abstract class AbstractZTask<TAction extends ZTaskSpec.Action> implements ZTask<TAction> {

  readonly target: ZPackage;
  readonly name: string;
  readonly taskQN: string;

  constructor(builder: ZTaskBuilder$, readonly spec: ZTaskSpec<TAction>) {
    this.target = builder.target;
    this.taskQN = this.name = builder.name;
  }

  params(): ZTaskParams.Partial {

    const { spec: { attrs, args } } = this;

    return { attrs, args };
  }

  async plan(planner: ZCallPlanner<TAction>): Promise<void> {
    await this.planDeps(planner);
  }

  asPre(
      planner: ZCallPlanner,
      { attrs, args }: ZTaskSpec.TaskRef,
  ): Promise<Iterable<ZCall>> {
    return Promise.all([planner.call(
        this,
        {
          params: planner.plannedCall.extendParams({ attrs, args }),
        },
    )]);
  }

  call(details?: ZCallDetails<TAction>): Promise<ZCall> {
    return this.target.setup.planner.call(this, details);
  }

  abstract exec(execution: ZTaskExecution<TAction>): void | PromiseLike<unknown>;

  protected async planDeps(planner: ZCallPlanner<TAction>): Promise<void> {

    const { target, spec } = this;
    let hasTasks = false;
    let targets: ZPackageSet | undefined;
    let parallel: ZTaskQualifier[] = [];
    let prevTasks: ZTask[] = [];

    for (const pre of spec.pre) {
      if (pre.selector != null) {
        targets = selectZTaskPreTargets(target, hasTasks ? undefined : targets, pre);
        hasTasks = false;
      } else {
        hasTasks = true;
        if (!pre.parallel) {
          planner.makeParallel(parallel);
          parallel = [];
        }

        const preTarget = targets || target;
        const preTasks = await resolveZTaskRef(preTarget, pre);
        const calledTasks: ZTask[] = [];

        for (const preTask of preTasks) {

          const preCalls = await preTask.asPre(planner, pre);

          for (const { task: preTask } of preCalls) {
            calledTasks.push(preTask);
            for (const prevTask of prevTasks) {
              planner.order(prevTask, preTask);
            }
          }
        }

        if (calledTasks.length === 1) {
          parallel.push(calledTasks[0]);
        } else {

          const qualifier: ZTaskQualifier = {
            taskQN: `${String(preTarget)} */${pre.task}`,
          };

          parallel.push(qualifier);
          for (const calledTask of calledTasks) {
            planner.qualify(calledTask, qualifier);
          }
        }

        prevTasks = calledTasks;
      }
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

/**
 * @internal
 */
function selectZTaskPreTargets(
    target: ZPackage,
    targets: ZPackageSet | undefined,
    packageRef: ZTaskSpec.PackageRef,
): ZPackageSet {

  const selected = target.select(packageRef.selector);

  if (!targets) {
    targets = selected;
  } else {
    targets = targets.andPackages(selected);
  }

  return targets;
}

/**
 * @internal
 */
async function resolveZTaskRef(targets: ZPackageSet, { task }: ZTaskSpec.TaskRef): Promise<Iterable<ZTask>> {
  return Promise.all(mapIt(
      await targets.packages(),
      target => target.task(task),
  ));
}


