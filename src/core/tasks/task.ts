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
export class ZTask implements ZInstruction {

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
  }

  instruct(recorder: ZInstructionRecorder): Promise<void> {

    const { target, spec } = this;
    const taskDetails = recorder.fulfil(this, valueProvider({
      attrs: spec.attrs,
      args: spec.args,
    }));

    return instructOnZTaskDeps(target, recorder, taskDetails, spec);
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

  const depDetails: ZTaskDetails = { attrs, args, actionArgs: [] };

  return {
    async instruct(recorded:ZInstructionRecorder) {
      for await (const target of targets.packages()) {

        const depTask = target.task(dep.task);

        if (subTaskNames.length) {

          const subTargets = trailingZTaskPackages(target, depTask.spec);

          for await (const subTarget of subTargets.packages()) {
            for (const subTaskName of subTaskNames) {
              recorded.fulfil(subTarget.task(subTaskName));
            }
          }
        }

        recorded.fulfil(
            depTask,
            () => ZTaskDetails.extend(depDetails, taskDetails()),
        );
      }
    },
  };
}

/**
 * @internal
 */
function trailingZTaskPackages(
    target: ZPackage,
    { args }: ZTaskSpec,
): ZPackageSet {

  const parser = target.resolver.taskParser;
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
