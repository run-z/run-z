import { valueProvider } from '@proc7ts/primitives';
import type { ZPackage, ZPackageSet } from '../../packages';
import type { ZCall, ZInstruction, ZPlanRecorder } from '../../plan';
import { ZTask } from '../task';
import type { ZTaskSpec } from '../task-spec';

/**
 * @internal
 */
export abstract class AbstractZTask<TAction extends ZTaskSpec.Action> extends ZTask<TAction> {

  readonly instruction: ZInstruction;

  constructor(target: ZPackage, name: string, spec: ZTaskSpec<TAction>) {
    super(target, name, spec);
    this.instruction = async (recorder: ZPlanRecorder): Promise<void> => {

      const call = await this.planCall(recorder);

      await this.planDeps(recorder, call);
    };
  }

  asDepOf(call: ZCall, { attrs, args }: ZTaskSpec.TaskRef): ZInstruction {
    return recorder => recorder.call(this, call.extendParams({ attrs, args }));
  }

  protected async planCall(recorder: ZPlanRecorder): Promise<ZCall> {

    const { spec: { attrs, args } } = this;

    return recorder.call(this, valueProvider({ attrs, args }));
  }

  protected async planDeps(recorder: ZPlanRecorder, call: ZCall): Promise<void> {

    const { target, spec } = this;
    let targets: ZPackageSet | undefined;
    let parallel: ZTask[] = [];

    for (const dep of spec.deps) {
      if (dep.selector != null) {
        targets = updateZTaskDepTargets(target, targets, dep);
      } else {
        if (!dep.parallel) {
          recorder.makeParallel(parallel);
          parallel = [];
        }

        const depTasks = await resolveZTaskRef(targets || target, dep);

        for (const depTask of depTasks) {
          await recorder.follow(depTask.asDepOf(call, dep));
          recorder.require(this, depTask);
          if (dep.parallel) {
            parallel.push(depTask);
          }
        }

        targets = undefined;
      }
    }

    if (this.isParallel()) {
      parallel.push(this);
    }
    recorder.makeParallel(parallel);
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


