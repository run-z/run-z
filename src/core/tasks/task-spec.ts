/**
 * Task specifier.
 *
 * Built by {@link ZTaskParser parsing command line}.
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
   * Target packages to apply a task to.
   *
   * The syntax is `[<SELECTOR>][...<TASK>]`, where `<SELECTOR>` is package selector, and `<TASK>` is a task to resolve
   * in each of the selected packages containing further package selectors to resolve.
   */
  export interface Target {
    /**
     * Relative package selector.
     */
    readonly selector: string;

    /**
     * A name of the task in selected package containing package selectors to reuse.
     */
    readonly task?: string | undefined;
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
     * Whether this is a task annex.
     *
     * Task annex is not executed, but can provide additional parameters for actual task call.
     */
    readonly annex: boolean;

    /**
     * Whether this prerequisite can be executed in parallel with preceding one.
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
     * The task is not executed when this {@link ZTaskParams.flag flag} is set.
     */
    readonly skip?: readonly [string, ...string[]] | null | undefined;

    /**
     * Unknown task execution throws {@link UnknownZTaskError} unless this {@link ZTaskParams.flag flag} is set.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    readonly 'if-present'?: readonly [string, ...string[]] | null | undefined;

    /**
     * A map of attribute values by their names.
     *
     * A `null` value means the attribute has been {@link ZTaskModifier.removeAttr removed}.
     */
    readonly [name: string]: readonly [string, ...string[]] | null | undefined;
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

    readonly command?: string | undefined;

    readonly args: readonly string[];
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

export const ZTaskSpec = {
  /**
   * Unknown task action specifier.
   */
  get unknownAction(): ZTaskSpec.Unknown {
    return unknownZTaskAction;
  },
};
