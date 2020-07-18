import type { ZPackage, ZPackageSet } from '../../packages';
import type { ZCall, ZCallInstruction, ZCallPlanner, ZTaskParams } from '../../plan';
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

  asDepOf(
      dependent: ZCall,
      { attrs, args }: ZTaskSpec.TaskRef,
  ): Iterable<ZCallInstruction> | AsyncIterable<ZCallInstruction> {
    return [{
      task: this,
      params: dependent.extendParams({ attrs, args }),
    }];
  }

  abstract exec(execution: ZTaskExecution<TAction>): void | PromiseLike<unknown>;

  protected async planDeps(planner: ZCallPlanner<TAction>): Promise<void> {

    const { plannedCall } = planner;
    const { target, spec } = this;
    let targets: ZPackageSet | undefined;
    let parallel: ZTask[] = [];
    const order: ZTask[] = [];

    for (const dep of spec.deps) {
      if (dep.selector != null) {
        targets = updateZTaskDepTargets(target, targets, dep);
      } else {
        if (!dep.parallel) {
          planner.makeParallel(parallel);
          parallel = [];
        }

        const depTasks = await resolveZTaskRef(targets || target, dep);

        for (const depTask of depTasks) {
          for await (const subTaskCall of depTask.asDepOf(plannedCall, dep)) {
            await planner.call(subTaskCall);
            order.push(subTaskCall.task);
            parallel.push(subTaskCall.task);
          }
        }

        targets = undefined;
      }
    }

    order.push(this);
    planner.order(order);

    if (this.isParallel()) {
      parallel.push(this);
    }
    planner.makeParallel(parallel);
  }

  /**
   * Whether this task can be called in parallel to dependencies.
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


