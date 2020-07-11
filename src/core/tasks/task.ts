/**
 * @packageDocumentation
 * @module run-z
 */
import { valueProvider } from '@proc7ts/primitives';
import type { ZInstruction, ZInstructionRecorder } from '../exec';
import type { ZPackage, ZPackageSet } from '../packages';
import { ZTaskDetails } from './task-details';
import type { ZTaskSpec } from './task-spec';

/**
 * Execution task.
 */
export class ZTask {

  readonly instruction: ZInstruction;

  /**
   * Constructs a task.
   *
   * @param target  Target package the task is applied to.
   * @param name  Task name.
   * @param spec  Task specifier.
   */
  constructor(
      readonly target: ZPackage,
      readonly name: string,
      readonly spec: ZTaskSpec,
  ) {
    this.instruction = async (recorder: ZInstructionRecorder): Promise<void> => {

      const { target, spec } = this;
      const taskDetails = await recorder.fulfil(
          this,
          valueProvider({
            attrs: spec.attrs,
            args: spec.args,
          }),
      );

      return instructOnZTaskDeps(target, recorder, taskDetails, spec);
    };
  }

  trailingTargets(): ZPackageSet {

    const { target } = this;
    const { args } = this.spec;
    const parser = target.setup.taskParser;
    let result: ZPackageSet | undefined;

    for (let i = args.length - 1; i >= 0; --i) {

      const arg = args[i];

      if (parser.isPackageSelector(arg)) {

        const selected = target.select(arg);

        result = result ? result.andPackages(selected) : selected;
      } else if (result) {
        break;
      }
    }

    return result || target;
  }

}

/**
 * @internal
 */
async function instructOnZTaskDeps(
    target: ZPackage,
    recorder: ZInstructionRecorder,
    taskDetails: (this: void) => ZTaskDetails,
    spec: ZTaskSpec,
): Promise<void> {

  let targets: ZPackageSet | undefined;

  for (const dep of spec.deps) {
    if (dep.selector != null) {

      const selected = target.select(dep.selector);

      if (!targets) {
        targets = selected;
      } else {
        targets = targets.andPackages(selected);
      }
      continue;
    }

    await recorder.follow(zTaskDepInstruction(targets || target, dep, taskDetails));
    targets = undefined;
  }
}

/**
 * @internal
 */
function zTaskDepInstruction(
    targets: ZPackageSet,
    dep: ZTaskSpec.TaskRef,
    taskDetails: (this: void) => ZTaskDetails,
): ZInstruction {

  const { attrs } = dep;
  const args: string[] = [];
  const subTaskNames: string[] = [];

  for (const arg of dep.args) {
    if (arg.startsWith('-')) {
      args.push(arg);
    } else {
      subTaskNames.push(arg);
    }
  }

  const depDetailsBase: ZTaskDetails = { attrs, args, actionArgs: [] };
  const depDetails = (): ZTaskDetails => ZTaskDetails.extend(depDetailsBase, taskDetails());
  const nativeDepDetailsBase = { attrs, args: dep.args, actionArgs: [] };
  const nativeDepDetails = (): ZTaskDetails => ZTaskDetails.extend(nativeDepDetailsBase, taskDetails());

  return async (recorder: ZInstructionRecorder) => {
    for await (const target of targets.packages()) {

      const depTask = target.task(dep.task);

      if (subTaskNames.length && !depTask.spec.isNative) {

        const subTargets = depTask.trailingTargets();

        for await (const subTarget of subTargets.packages()) {
          for (const subTaskName of subTaskNames) {
            await recorder.fulfil(subTarget.task(subTaskName), taskDetails);
          }
        }
      }

      await recorder.fulfil(
          depTask,
          depTask.spec.isNative ? nativeDepDetails : depDetails,
      );
    }
  };
}
