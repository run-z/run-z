/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTask } from './task';
import type { ZTaskModifier } from './task-modifier';
import type { ZTaskSpec } from './task-spec';

/**
 * Task builder.
 *
 * Can be created by {@link ZTaskFactory.newTask task factory}, filled with task data, and the used to
 * {@link task build a task}.
 *
 * @typeparam TAction  Task action type the builder produces.
 */
export interface ZTaskBuilder<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> extends ZTaskModifier {

  readonly action?: TAction;

  /**
   * Assigns a task action.
   *
   * The task action defaults to {@link Group grouping task} unless reassigned by this call.
   *
   * @typeparam TNewAction  New task action type.
   * @param action  Action to assign to the task.
   *
   * @returns `this` instance producing a task with new action type.
   */
  setAction<TNewAction extends ZTaskSpec.Action>(action: TNewAction): ZTaskBuilder<TNewAction>;

  /**
   * Parses a command line and {@link applyOptions applies} recognized options to the task.
   *
   * @param commandLine  Task command line to parse.
   *
   * @returns A promise resolved to `this` instance when the command line parsed.
   *
   * @see TaskFactory.parse
   */
  parse(commandLine: string): Promise<this>;

  /**
   * Recognized options from command line arguments and applies them to the task.
   *
   * @param args  Arguments to apply.
   * @param fromIndex  An index of command line argument to start processing from. `0` by default.
   *
   * @returns A promise resolved to `this` instance when command line options applied.
   *
   * @see TaskFactory.applyOptions
   */
  applyOptions(args: readonly string[], fromIndex?: number): Promise<this>;

  /**
   * Recognizes options from process command line argument and {@link applyOptions applies} them to the task.
   *
   * This is a method to be executed from CLI.
   *
   * When the task name specified (typically by `npm_lifecycle_event` environment variable), finds the corresponding
   * script in `package.json`, and detects the options specified explicitly. I.e. the ones following the script ones.
   * Then {@link applyOptions applies} explicit options after script options. This makes it possible to specify global
   * options even though the script contains `--then` or `--and` option.
   *
   * If the above fails, just {@link applyOptions applies command line options} as they are.
   *
   * @param taskName  Known task name.
   * @param argv  Command line arguments of the process.
   * @param fromIndex  An index of command line argument to start processing from. `2` by default.
   *
   * @returns A promise resolved to `this` instance when command line options applied.
   */
  applyArgv(
      taskName: string | undefined,
      argv: readonly string[],
      fromIndex?: number,
  ): Promise<this>;

  /**
   * Builds a task specifier with the data added to the builder.
   *
   * @returns New task specifier.
   */
  spec(): ZTaskSpec<TAction>;

  /**
   * Builds a task with the data added to the builder.
   *
   * @returns New task.
   */
  task(): ZTask<TAction>;

}
