import { ZBatching } from '../batches/batching.js';
import { ZTaskExecutor } from '../jobs/task-executor.js';
import { ZPackage } from '../packages/package.js';
import { ZTaskSpec } from './task-spec.js';

/**
 * Task modifier interface.
 *
 * Implemented by both {@link ZTaskBuilder} and {@link ZTaskOption}.
 */
export interface ZTaskModifier {
  /**
   * Target package the task is applied to.
   */
  readonly taskTarget: ZPackage;

  /**
   * Task name.
   */
  readonly taskName: string;

  /**
   * Prerequisites batching policy.
   */
  readonly batching: ZBatching;

  /**
   * Action specifier set by {@link setAction}.
   */
  readonly action: ZTaskSpec.Action | undefined;

  /**
   * Appends a task prerequisite.
   *
   * @param pre - Prerequisite specifier to append.
   *
   * @returns `this` instance.
   */
  addPre(pre: ZTaskSpec.Pre): this;

  /**
   * Appends a task attribute.
   *
   * If the `name` specifies a sub-attribute (i.e. has a form `attr:sub-attr`), then also adds an `attr=sub-attr`
   * attribute value.
   *
   * @param name - Target attribute name.
   * @param value - Attribute value to append.
   *
   * @returns `this` instance.
   */
  addAttr(name: string, value: string): this;

  /**
   * Appends task attributes.
   *
   * @param attrs - Attributes to append
   *
   * @returns `this` instance.
   */
  addAttrs(attrs: ZTaskSpec.Attrs): this;

  /**
   * Removes a task attribute.
   *
   * Removes all values of the target attribute.
   *
   * @param name - Target attribute name.
   *
   * @returns `this` instance.
   */
  removeAttr(name: string): this;

  /**
   * Appends raw command line argument(s) to the task.
   *
   * @param args - Command line argument(s) to append.
   *
   * @returns `this` instance.
   */
  addArg(...args: string[]): this;

  /**
   * Sets a policy for prerequisites batching.
   *
   * Each prerequisite task name represents a batch of tasks to execute. The batch execution will be planned with the
   * given `batching` policy.
   *
   * A single task call will be planned {@link ZBatcher:var#batchTask by default}.
   *
   * @param batching - New batching policy.
   *
   * @returns `this` instance.
   */
  setBatching(batching: ZBatching): this;

  /**
   * Assigns a task action.
   *
   * The task action defaults to {@link ZTaskSpec.Group grouping task} unless reassigned by this call.
   *
   * @typeParam TNewAction  New task action type.
   * @param action - Action to assign to the task.
   *
   * @returns `this` instance.
   */
  setAction(action: ZTaskSpec.Action): ZTaskModifier;

  /**
   * Overrides task executor.
   *
   * This method call overrides normal task execution. E.g. to display help info.
   *
   * @param executor - New executor for task execution.
   *
   * @returns `this` instance.
   */
  executeBy(executor: ZTaskExecutor): ZTaskModifier;
}
