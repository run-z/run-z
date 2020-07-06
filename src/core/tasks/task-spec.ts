/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * Task specifier.
 */
export interface ZTaskSpec {

  /**
   * Whether this is a native task.
   *
   * `true` when this is no a `run-z` command
   */
  readonly isNative: boolean;

  /**
   * Task dependencies.
   *
   * I.e. other tasks to run before this one.
   */
  readonly deps: readonly ZTaskSpec.Dep[];

  /**
   * Task attributes.
   */
  readonly attrs: ZTaskSpec.Attrs;

  /**
   * Additional command line arguments.
   */
  readonly args: readonly string[];

}

export namespace ZTaskSpec {

  /**
   * Task dependency.
   *
   * Either task or package reference.
   */
  export type Dep = PackageRef | TaskRef;

  /**
   * Package reference.
   *
   * When present among {@link ZTaskSpec.deps task dependencies} the subsequent tasks are searched in selected packages.
   */
  export interface PackageRef {

    readonly task?: undefined;

    /**
     * Relative {@link ZTaskParser.isPackageSelector path to package}.
     */
    readonly selector: string;

  }

  /**
   * Task reference.
   */
  export interface TaskRef {

    /**
     * Task name.
     */
    readonly task: string;

    readonly selector?: undefined;

    /**
     * Whether this task can be executed in parallel with preceding one.
     */
    readonly parallel: boolean;

    /**
     * Referenced task attributes.
     */
    readonly attrs: Attrs;

    /**
     * Command line arguments.
     */
    readonly args: readonly string[];

  }

  /**
   * Task attributes specifier.
   */
  export interface Attrs {

    /**
     * A map of attribute values by their names.
     */
    readonly [name: string]: readonly string[];

  }

}
