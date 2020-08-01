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
   * A reference to target package to apply a task to.
   *
   * I.e. a reference to package of prerequisite tasks.
   *
   * When present among {@link ZTaskSpec.pre task prerequisites} the subsequent tasks are searched in selected
   * packages.
   */
  export interface Target {

    /**
     * Relative {@link ZTaskParser.isPackageSelector package selector}.
     */
    readonly selector: string;

  }

  /**
   * Task prerequisite.
   *
   * I.e. another task to call before the task.
   */
  export interface Pre {

    /**
     * Prerequisite targets.
     *
     * Prerequisite task is searched and applies to each of these targets.
     *
     * When empty the prerequisite is applied to the target of dependent task.
     */
    readonly targets: readonly Target[];

    /**
     * Prerequisite task name.
     */
    readonly task: string;

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

    readonly command?: undefined;

  }

  /**
   * Task grouping action.
   */
  export interface Group {

    readonly type: 'group';

    readonly command?: undefined;

    /**
     * Default sub-task targets.
     *
     * When empty sub-tasks are searched and applied to the target of dependent task.
     */
    readonly targets: readonly Target[];

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
