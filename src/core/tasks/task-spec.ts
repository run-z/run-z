/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * Task specifier.
 *
 * Built by {@link ZTaskParser.parse parsing command line}.
 */
export interface ZTaskSpec<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  /**
   * Task prerequisites.
   *
   * I.e. other tasks to run before this one.
   */
  readonly pre: readonly ZTaskSpec.Pre[];

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
   * Prerequisite of the task.
   *
   * Either task or package reference.
   */
  export type Pre = PackageRef | TaskRef;

  /**
   * A reference to package of prerequisite tasks.
   *
   * When present among {@link ZTaskSpec.pre task prerequisites} the subsequent tasks are searched in selected
   * packages.
   */
  export interface PackageRef {

    readonly task?: undefined;

    /**
     * Relative {@link ZTaskParser.isPackageSelector path to package}.
     */
    readonly selector: string;

  }

  /**
   * Prerequisite task reference.
   */
  export interface TaskRef {

    /**
     * Task name.
     */
    readonly task: string;

    readonly selector?: undefined;

    /**
     * Whether the referenced task can be executed in parallel with preceding one.
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
     * Unknown task throws {@link UnknownZTaskError}, unless this {@link ZTaskParams.flag flag} is set.
     */
    readonly 'if-present'?: readonly [string, ...string[]];

    /**
     * A map of attribute values by their names.
     */
    readonly [name: string]: readonly [string, ...string[]] | undefined;

  }

  /**
   * Task action.
   */
  export type Action = Command | Script | Group | Unknown;

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
     * Whether the command can be executed in parallel with the last prerequisite.
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
   * Task grouping action.
   */
  export interface Group {

    readonly type: 'group';

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
const groupZTaskAction: ZTaskSpec.Group = {
  type: 'group',
};

/**
 * @internal
 */
const unknownZTaskAction: ZTaskSpec.Unknown = {
  type: 'unknown',
};

/**
 * @internal
 */
const scriptZTaskAction: ZTaskSpec.Script = {
  type: 'script',
};

export const ZTaskSpec = {

  /**
   * Grouping task action specifier.
   */
  get groupAction(): ZTaskSpec.Group {
    return groupZTaskAction;
  },

  /**
   * Unknown task action specifier.
   */
  get unknownAction(): ZTaskSpec.Unknown {
    return unknownZTaskAction;
  },

  /**
   * NPM script execution task specifier.
   */
  get scriptAction(): ZTaskSpec.Script {
    return scriptZTaskAction;
  },

};
