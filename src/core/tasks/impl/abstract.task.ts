import type { ZPackage, ZPackageSet } from '../../packages';
import type { ZCall, ZCallPlanner, ZTaskParams } from '../../plan';
import type { ZTaskExecution } from '../../plan/task-execution';
import type { ZTask } from '../task';
import type { ZTaskSpec } from '../task-spec';

/**
 * @internal
 */
export abstract class AbstractZTask<TAction extends ZTaskSpec.Action> implements ZTask<TAction> {

  constructor(
      readonly target: ZPackage,
      readonly name: string,
      readonly spec: ZTaskSpec<TAction>,
  ) {
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
    return Promise.all([planner.call({
      task: this,
      params: planner.plannedCall.extendParams({ attrs, args }),
    })]);
  }

  abstract exec(execution: ZTaskExecution<TAction>): void | PromiseLike<unknown>;

  protected async planDeps(planner: ZCallPlanner<TAction>): Promise<void> {

    const { target, spec } = this;
    let targets: ZPackageSet | undefined;
    let parallel: ZTask[] = [];
    let prevTasks: ZTask[] = [];

    for (const dep of spec.pre) {
      if (dep.selector != null) {
        targets = updateZTaskDepTargets(target, targets, dep);
      } else {
        if (!dep.parallel) {
          planner.makeParallel(parallel);
          parallel = [];
        }

        const preTasks = await resolveZTaskRef(targets || target, dep);
        const calledTasks: ZTask[] = [];

        for (const preTask of preTasks) {

          const preCalls = await preTask.asPre(planner, dep);

          for (const { task: preTask } of preCalls) {
            calledTasks.push(preTask);
            parallel.push(preTask);
            for (const prevTask of prevTasks) {
              planner.order(prevTask, preTask);
            }
          }
        }

        prevTasks = calledTasks;
        targets = undefined;
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
function updateZTaskDepTargets(
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
async function resolveZTaskRef(targets: ZPackageSet, taskRef: ZTaskSpec.TaskRef): Promise<ZTask[]> {

  const result: ZTask[] = [];

  for await (const target of targets.packages()) {
    result.push(target.task(taskRef.task));
  }

  return result;
}


