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

    for (const dep of spec.deps) {
      if (dep.selector != null) {
        targets = updateZTaskDepTargets(target, targets, dep);
      } else {
        await planZTaskDeps(recorder, call, targets || target, dep);
        targets = undefined;
      }
    }
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
async function planZTaskDeps(
    recorder: ZPlanRecorder,
    call: ZCall,
    targets: ZPackageSet,
    taskRef: ZTaskSpec.TaskRef,
): Promise<void> {
  for await (const target of targets.packages()) {

    const depTask = target.task(taskRef.task);

    await recorder.follow(depTask.asDepOf(call, taskRef));
  }
}


