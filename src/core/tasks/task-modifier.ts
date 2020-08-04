/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZBatcher } from '../batches';
import type { ZPackage } from '../packages';
import type { ZTaskSpec } from './task-spec';

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
   * Action specifier set by {@link setAction}.
   */
  readonly action?: ZTaskSpec.Action;

  /**
   * Appends a task prerequisite.
   *
   * @param pre  Prerequisite specifier to append.
   *
   * @returns `this` instance.
   */
  addPre(pre: ZTaskSpec.Pre): this;

  /**
   * Appends a task attribute.
   *
   * @param name  Target attribute name.
   * @param value  Attribute value to append.
   *
   * @returns `this` instance.
   */
  addAttr(name: string, value: string): this;

  /**
   * Appends task attributes.
   *
   * @param attrs  Attributes to append
   *
   * @returns `this` instance.
   */
  addAttrs(attrs: ZTaskSpec.Attrs): this;

  /**
   * Appends raw command line argument(s) to the task.
   *
   * @param args  Command line argument(s) to append.
   *
   * @returns `this` instance.
   */
  addArg(...args: string[]): this;

  /**
   * Sets a batcher of prerequisite tasks to execute.
   *
   * Each prerequisite task name represents a batch of tasks to execute. The batch execution will be planned by the
   * given `batcher`.
   *
   * A single task call will be planned {@link ZBatcher.batchTask by default}.
   *
   * @param batcher  New batcher.
   *
   * @returns `this` instance.
   */
  setBatcher(batcher: ZBatcher): this;

  /**
   * Assigns a task action.
   *
   * The task action defaults to {@link Group grouping task} unless reassigned by this call.
   *
   * @typeparam TNewAction  New task action type.
   * @param action  Action to assign to the task.
   *
   * @returns `this` instance.
   */
  setAction(action: ZTaskSpec.Action): ZTaskModifier;

}
