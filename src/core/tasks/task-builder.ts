/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZOptionsParser } from '@run-z/optionz';
import type { ZTask } from './task';
import type { ZTaskModifier } from './task-modifier';
import type { ZTaskOption } from './task-option';
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

  readonly action: TAction | undefined;

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
   * @param opts  Parser options. By default, starts command line options processing from the second argument.
   *
   * @returns A promise resolved to `this` instance when the command line parsed.
   *
   * @see TaskFactory.parse
   */
  parse(commandLine: string, opts?: ZOptionsParser.Opts<ZTaskOption>): Promise<this>;

  /**
   * Recognized options from command line arguments and applies them to the task.
   *
   * @param args  Arguments to apply.
   * @param opts  Parser options.
   *
   * @returns A promise resolved to `this` instance when command line options applied.
   *
   * @see TaskFactory.applyOptions
   */
  applyOptions(args: readonly string[], opts?: ZOptionsParser.Opts<ZTaskOption>): Promise<this>;

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
   * @param opts  Parser options. By default, starts command line options processing from the third argument.
   *
   * @returns A promise resolved to `this` instance when command line options applied.
   */
  applyArgv(
      taskName: string | undefined,
      argv: readonly string[],
      opts?: ZOptionsParser.Opts<ZTaskOption>,
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
