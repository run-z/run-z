import type { ZOption, ZOptionReader } from '@run-z/optionz';
import type { ZTaskModifier } from './task-modifier';
import type { ZTaskSpec } from './task-spec';

/**
 * An option of the command line containing a task specifier.
 *
 * This is passed to {@link ZTaskOption.Reader option reader}.
 */
export interface ZTaskOption extends ZOption, ZTaskModifier {
  /**
   * Prerequisite specification instance.
   *
   * This instance is always available, but it is illegal to call its modification methods unless prerequisite
   * specification {@link ZTaskOption.Pre.start started}.
   */
  readonly pre: ZTaskOption.Pre;

  /**
   * Whether the task action or executor accepts command line arguments.
   */
  readonly acceptsArgs: boolean;

  /**
   * Assigns a task action.
   *
   * The task action defaults to {@link Group grouping task} unless reassigned by this call.
   *
   * @param action - The action to assign to the task.
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
   * Current prerequisite specifier to fill from {@link ZTaskOption command line}.
   *
   * Prerequisite specification is started by {@link ZTaskOption.Pre.start} method, and concluded either
   * {@link conclude explicitly} or by any task specifier modification. Once concluded it is {@link ZTaskOption.addPre
   * added to the task specifier}.
   *
   * It is an error to modify this specifier before the specification {@link start started} or after it is
   * {@link conclude concluded}.
   *
   * Available via {@link ZTaskOption.pre} property.
   */
  export interface Pre {
    /**
     * Whether the prerequisite specification {@link start started} and not {@link conclude concluded} yet.
     *
     * It is illegal to modify the prerequisite specifier when this property value is `false`.
     */
    readonly isStarted: boolean;

    /**
     * The name of prerequisite task passed to the most recent call to {@link start} method, unless it is already
     * {@link conclude concluded}.
     */
    readonly taskName?: string | undefined;

    /**
     * Whether the started task is an {@link ZTaskSpec.Pre.annex annex}.
     */
    readonly isAnnex: boolean;

    /**
     * Starts the next prerequisite specification.
     *
     * {@link conclude Concludes} previously started one.
     *
     * The prerequisite will be added as soon as its specification {@link conclude concluded}.
     *
     * @param taskName - The name of prerequisite task.
     * @param annex - Whether the started prerequisite is a task annex.
     *
     * @returns `this` instance.
     */
    start(taskName: string, annex?: boolean): this;

    /**
     * Appends prerequisite attribute.
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
     * Appends prerequisite attributes.
     *
     * @param attrs - Attributes to append.
     *
     * @returns `this` instance.
     */
    addAttrs(attrs: ZTaskSpec.Attrs): this;

    /**
     * Removes prerequisite attribute.
     *
     * Removes all values of the target attribute.
     *
     * @param name - Target attribute name.
     *
     * @returns `this` instance.
     */
    removeAttr(name: string): this;

    /**
     * Appends raw prerequisite argument(s).
     *
     * @param args - Prerequisite arguments to add.
     *
     * @returns `this` instance.
     */
    addArg(...args: string[]): this;

    /**
     * Appends arbitrary prerequisite option.
     *
     * @param option - The option to append. This can be either an {@link addAttr attribute} specifier, or an
     * {@link addArg argument}.
     *
     * @returns `this` instance.
     */
    addOption(option: string): this;

    /**
     * Makes a prerequisite to run in parallel with the next one.
     *
     * {@link conclude Concludes} current prerequisite.
     */
    parallelToNext(): void;

    /**
     * Sets the target(s) for the next prerequisite(s).
     *
     * {@link conclude Concludes} current prerequisite.
     *
     * @param targets - Task target specifier(s) to add.
     */
    nextTarget(...targets: ZTaskSpec.Target[]): void;

    /**
     * Concludes current prerequisite specification.
     *
     * Does nothing if specification is not {@link isStarted started}.
     *
     * @returns Concluded prerequisite specifier, or `undefined` if prerequisite specification is not started.
     */
    conclude(): ZTaskSpec.Pre | undefined;
  }
}
