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
   * Command line arguments to the script this task executes.
   */
  readonly args: readonly string[];

}

export namespace ZTaskSpec {

  /**
   * Task dependency.
   *
   * Either task or scope reference.
   */
  export type Dep = HostRef | TaskRef;

  /**
   * Task host reference.
   *
   * When present among {@link ZTaskSpec.deps task dependencies} the subsequent tasks are form the given host package.
   */
  export interface HostRef {

    readonly task?: undefined;

    /**
     * Relative {@link ZTaskParser.isPackagePath path to package}.
     */
    readonly host: string;

  }

  /**
   * Task reference.
   */
  export interface TaskRef {

    /**
     * Task name.
     */
    readonly task: string;

    readonly host?: undefined;

    /**
     * Whether this task can be executed in parallel with preceding one.
     */
    readonly parallel: boolean;

    /**
     * Command line arguments.
     */
    readonly args: readonly string[];

  }

}
