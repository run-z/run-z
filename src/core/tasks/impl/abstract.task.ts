import type { ZPackage, ZPackageSet } from '../../packages';
import type { ZCall, ZCallInstruction, ZCallPlanner, ZTaskParams } from '../../plan';
import { ZTask } from '../task';
import type { ZTaskSpec } from '../task-spec';

/**
 * @internal
 */
export abstract class AbstractZTask<TAction extends ZTaskSpec.Action> extends ZTask<TAction> {

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

  protected async planDeps(planner: ZCallPlanner<TAction>): Promise<void> {

    const { plannedCall } = planner;
    const { target, spec } = this;
    let targets: ZPackageSet | undefined;
    let parallel: ZTask[] = [];

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
            planner.require(this, subTaskCall.task);
            if (dep.parallel) {
              parallel.push(subTaskCall.task);
            }
          }
        }

        targets = undefined;
      }
    }

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


