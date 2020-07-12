/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * Task specifier.
 */
export interface ZTaskSpec<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

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

  /**
   * Task action.
   */
  readonly action: TAction;

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

  /**
   * Task action.
   */
  export type Action = Command | Script | NoOp | Unknown;

  /**
   * Command execution action of the task.
   */
  export interface Command {

    readonly type: 'command';

    /**
     * Command to execute.
     */
    readonly command: string;

    /**
     * Whether the command can be executed in parallel with preceding dependency task.
     */
    readonly parallel: boolean;

    /**
     * Command line arguments.
     */
    readonly args: readonly string[];

  }

  /**
   * NPM script execution action.
   */
  export interface Script {

    readonly type: 'script';

    readonly command?: string;

  }

  /**
   * No-op action.
   */
  export interface NoOp {

    readonly type: 'noop';

    readonly command?: undefined;

  }

  /**
   * Unknown action.
   */
  export interface Unknown {

    readonly type: 'unknown';

    readonly command?: undefined;

  }

}

/**
 * @internal
 */
const noopZTaskAction: ZTaskSpec.NoOp = {
  type: 'noop',
};

/**
 * @internal
 */
const unknownZTaskSpec: ZTaskSpec<ZTaskSpec.Unknown> = {
  deps: [],
  attrs: {},
  args: [],
  action: {
    type: 'unknown',
  },
};

/**
 * @internal
 */
const scriptZTaskSpec: ZTaskSpec<ZTaskSpec.Script> = {
  deps: [],
  attrs: {},
  args: [],
  action: {
    type: 'script',
  },
};

export const ZTaskSpec = {

  /**
   * No-op task specifier.
   */
  get noopAction(): ZTaskSpec.NoOp {
    return noopZTaskAction;
  },

  /**
   * Unknown task specifier.
   */
  get unknown(): ZTaskSpec<ZTaskSpec.Unknown> {
    return unknownZTaskSpec;
  },

  /**
   * NPM script execution task specifier.
   */
  get script(): ZTaskSpec<ZTaskSpec.Script> {
    return scriptZTaskSpec;
  },

};
