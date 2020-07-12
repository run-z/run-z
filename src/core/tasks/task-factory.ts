/**
 * @packageDocumentation
 * @module run-z
 */
import { valueProvider } from '@proc7ts/primitives';
import type { ZInstruction, ZInstructionRecorder } from '../exec';
import type { ZPackage, ZPackageSet } from '../packages';
import { ZTask } from './task';
import { ZTaskDetails } from './task-details';
import { ZTaskSpec } from './task-spec';

/**
 * Task factory.
 */
export class ZTaskFactory {

  /**
   * Creates a task instance by its {@link ZTaskSpec specifier}.
   *
   * @typeparam TAction  Task action type.
   * @param target  Target package the task is applied to.
   * @param name  Task name.
   * @param spec  Task specifier.
   */
  createTask<TAction extends ZTaskSpec.Action>(
      target: ZPackage,
      name: string,
      spec: ZTaskSpec<TAction>,
  ): ZTask<TAction> {
    switch (spec.action.type) {
    case 'command':
      return new CommandZTask(target, name, spec as ZTaskSpec<ZTaskSpec.Command>) as ZTask<TAction>;
    case 'script':
      return new ScriptZTask(target, name) as ZTask<TAction>;
    case 'noop':
      return new NoOpZTask(target, name, spec as ZTaskSpec<ZTaskSpec.NoOp>) as ZTask<TAction>;
    case 'unknown':
    default:
      return new UnknownZTask(target, name) as ZTask<TAction>;
    }
  }

}

/**
 * @internal
 */
abstract class AbstractZTask<TAction extends ZTaskSpec.Action> extends ZTask<TAction> {

  readonly instruction: ZInstruction;

  constructor(target: ZPackage, name: string, spec: ZTaskSpec<TAction>) {
    super(target, name, spec);
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

  get acceptsSubTasks(): boolean {
    return false;
  }

}

/**
 * @internal
 */
class CommandZTask extends AbstractZTask<ZTaskSpec.Command> {

  get acceptsSubTasks(): true {
    return true;
  }

}

/**
 * @internal
 */
class NoOpZTask extends AbstractZTask<ZTaskSpec.NoOp> {

  get acceptsSubTasks(): true {
    return true;
  }

}

/**
 * @internal
 */
class ScriptZTask extends AbstractZTask<ZTaskSpec.Script> {

  constructor(target: ZPackage, name: string) {
    super(target, name, ZTaskSpec.script);
  }

}

/**
 * @internal
 */
class UnknownZTask extends AbstractZTask<ZTaskSpec.Unknown> {

  constructor(target: ZPackage, name: string) {
    super(target, name, ZTaskSpec.unknown);
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

  const commandDepDetailsBase: ZTaskDetails = { attrs, args, actionArgs: [] };
  const commandDepDetails = (): ZTaskDetails => ZTaskDetails.extend(commandDepDetailsBase, taskDetails());
  const scriptDepDetailsBase = { attrs, args: dep.args, actionArgs: [] };
  const scriptDepDetails = (): ZTaskDetails => ZTaskDetails.extend(scriptDepDetailsBase, taskDetails());

  return async (recorder: ZInstructionRecorder) => {
    for await (const target of targets.packages()) {

      const depTask = target.task(dep.task);
      const { acceptsSubTasks } = depTask;

      if (!acceptsSubTasks && subTaskNames.length) {

        const subTargets = zTaskTrailingTargets(depTask);

        for await (const subTarget of subTargets.packages()) {
          for (const subTaskName of subTaskNames) {
            await recorder.fulfil(subTarget.task(subTaskName), taskDetails);
          }
        }
      }

      await recorder.fulfil(
          depTask,
          acceptsSubTasks ? scriptDepDetails : commandDepDetails,
      );
    }
  };
}

/**
 * @internal
 */
function zTaskTrailingTargets(task: ZTask): ZPackageSet {

  const { target, spec: { args } } = task;
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
