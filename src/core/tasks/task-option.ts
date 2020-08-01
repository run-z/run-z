/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZOption, ZOptionReader } from '@run-z/optionz';
import type { ZPackage } from '../packages';
import type { ZTaskSpec } from './task-spec';

/**
 * An option of the command line containing a task specifier.
 *
 * This is passed to {@link ZTaskOption.Reader option reader}.
 */
export interface ZTaskOption extends ZOption {

  /**
   * Target package the task is applied to.
   */
  readonly taskTarget: ZPackage;

  /**
   * Task name.
   */
  readonly taskName: string;

  /**
   * Prerequisite task call specification instance.
   *
   * This instance is always available, but it is illegal to call its modification methods unless the task call
   * specification {@link ZTaskOption.PreTask.start started}.
   */
  readonly preTask: ZTaskOption.PreTask;

  /**
   * Appends a task prerequisite.
   *
   * @param pre  Prerequisite specifier to append.
   *
   * @returns `this` instance.
   */
  addPre(pre: ZTaskSpec.Pre): this;

  /**
   * Appends task attribute.
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
   * @param attrs  Attributes to append.
   *
   * @returns `this` instance.
   */
  addAttrs(attrs: ZTaskSpec.Attrs): this;

  /**
   * Appends raw command line argument(s) to the task action.
   *
   * It is illegal to add arguments without {@link setAction action set}.
   *
   * @param args  Command line argument(s) to append.
   *
   * @returns `this` instance.
   */
  addArg(...args: string[]): this;

  /**
   * Assigns a task action.
   *
   * The task action defaults to {@link Group grouping task} unless reassigned by this call.
   *
   * @param action  Action to assign to the task.
   *
   * @returns `this` instance.
   */
  setAction(action: ZTaskSpec.Action): this;

}

export namespace ZTaskOption {

  /**
   * A signature of the reader of the command line containing a task specifier.
   */
  export type Reader = ZOptionReader<ZTaskOption>;

  /**
   * A representation of current prerequisite task call specifier.
   *
   * The call specifier is started by {@link ZTaskOption.PreTask.start} and concluded either
   * {@link conclude explicitly}, or by any task modification. Once concluded it is {@link ZTaskOption.addPre added}
   * to the task.
   *
   * It is an error to call the methods of this object before the prerequisite task call specification {@link start
   * started} or after it is {@link conclude concluded}.
   *
   * Available via {@link ZTaskOption.preTask} property.
   */
  export interface PreTask {

    /**
     * Whether the task call specification {@link start started} and not {@link conclude concluded} yet.
     *
     * It is illegal to modify the task call specifier when this property value is `false`.
     */
    readonly isStarted: boolean;

    /**
     * The name of prerequisite task passed to the most recent call to {@link start} method, unless it is already
     * {@link conclude concluded}.
     */
    readonly taskName?: string;

    /**
     * Starts a specification of prerequisite task call.
     *
     * {@link conclude Concludes} previously started specification.
     *
     * The prerequisite will be added as soon as this task specification is {@link conclude concluded}.
     *
     * @param taskName  The name of prerequisite task to call.
     *
     * @returns `this` instance.
     */
    start(taskName: string): this;

    /**
     * Appends attribute to prerequisite task call.
     *
     * @param name  Target attribute name.
     * @param value  Attribute value to append.
     *
     * @returns `this` instance.
     */
    addAttr(name: string, value: string): this;

    /**
     * Appends attributes to prerequisite task call.
     *
     * @param attrs  Attributes to append.
     *
     * @returns `this` instance.
     */
    addAttrs(attrs: ZTaskSpec.Attrs): this;

    /**
     * Appends argument(s) to prerequisite task call.
     *
     * @param args  Prerequisite arguments to add.
     *
     * @returns `this` instance.
     */
    addArg(...args: string[]): this;

    /**
     * Appends arbitrary option to prerequisite task call.
     *
     * This can be either an {@link addAttr attribute} specifier, or an {@link addArg argument}.
     *
     * @param option  The option to append.
     *
     * @returns `this` instance.
     */
    addOption(option: string): this;

    /**
     * Makes a prerequisite task call run in parallel with the next one.
     *
     * Concludes current prerequisite task call.
     */
    parallelToNext(): void;

    /**
     * Concludes current prerequisite task call specification.
     *
     * Does nothing if specification is not {@link start started}.
     */
    conclude(): void;

  }

}
