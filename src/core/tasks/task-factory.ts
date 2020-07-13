/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
import { CommandZTask, GroupZTask, ScriptZTask, UnknownZTask } from './impl';
import type { ZTask } from './task';
import type { ZTaskSpec } from './task-spec';

/**
 * Task factory.
 */
export class ZTaskFactory {

  /**
   * Creates a task by its {@link ZTaskSpec specifier}.
   *
   * Delegates to corresponding `create...()` method.
   *
   * @typeparam TAction  Task action type.
   * @param target  Target package the task is applied to.
   * @param name  Task name.
   * @param spec  Task specifier.
   *
   * @returns New task instance.
   */
  createTask<TAction extends ZTaskSpec.Action>(
      target: ZPackage,
      name: string,
      spec: ZTaskSpec<TAction>,
  ): ZTask<TAction> {
    switch (spec.action.type) {
    case 'command':
      return this.createCommand(target, name, spec as ZTaskSpec<ZTaskSpec.Command>) as ZTask<TAction>;
    case 'group':
      return this.createGroup(target, name, spec as ZTaskSpec<ZTaskSpec.Group>) as ZTask<TAction>;
    case 'script':
      return this.createScript(target, name) as ZTask<TAction>;
    case 'unknown':
    default:
      return this.createUnknown(target, name) as ZTask<TAction>;
    }
  }

  /**
   * Creates a command execution task by its {@link ZTaskSpec.Command specifier}.
   *
   * @param target  Target package the task is applied to.
   * @param name  Task name.
   * @param spec  Task specifier.
   *
   * @returns New command execution task instance.
   */
  createCommand(target: ZPackage, name: string, spec: ZTaskSpec<ZTaskSpec.Command>): ZTask<ZTaskSpec.Command> {
    return new CommandZTask(target, name, spec);
  }

  /**
   * Creates a grouping task by its {@link ZTaskSpec.Group specifier}.
   *
   * @param target  Target package the task is applied to.
   * @param name  Task name.
   * @param spec  Task specifier.
   *
   * @returns New grouping task instance.
   */
  createGroup(target: ZPackage, name: string, spec: ZTaskSpec<ZTaskSpec.Group>): ZTask<ZTaskSpec.Group> {
    return new GroupZTask(target, name, spec);
  }

  /**
   * Creates an NPM script execution task.
   *
   * @param target  Target package the task is applied to.
   * @param name  Task name.
   *
   * @returns New NPM script execution task instance.
   */
  createScript(target: ZPackage, name: string): ZTask<ZTaskSpec.Script> {
    return new ScriptZTask(target, name);
  }

  /**
   * Creates an unknown task.
   *
   * @param target  Target package the task is applied to.
   * @param name  Task name.
   *
   * @returns New unknown task instance.
   */
  createUnknown(target: ZPackage, name: string): ZTask<ZTaskSpec.Unknown> {
    return new UnknownZTask(target, name);
  }

}
