/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZExecution } from '@run-z/exec-z';
import type { ZJob } from '../jobs';
import type { ZPackage } from '../packages';
import type { ZCall, ZCallDetails, ZPrePlanner } from '../plan';
import type { ZTaskSpec } from './task-spec';

/**
 * Execution task.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZTask<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> extends ZTaskQualifier {

  /**
   * Target package the task is applied to.
   */
  readonly target: ZPackage;

  /**
   * Task name.
   */
  readonly name: string;

  /**
   * Task specifier.
   */
  readonly spec: ZTaskSpec<TAction>;

  /**
   * Task names this one is alike.
   *
   * If the task is alike another one, the task parameters and parallel execution rules applied to another are applied
   * to the task itself.
   */
  readonly alike: Iterable<string>;

  /**
   * Builds initial details for {@link call calling} this task.
   *
   * @param call  This task call to build details of.
   *
   * @return Full task call details.
   */
  callDetails(call: ZCall<TAction>): ZCallDetails.Full<TAction>;

    /**
     * Plans a call to this task as a prerequisite of another one.
   *
   * By default a {@link ZTaskSpec.Group grouping task} treats the first argument as a sub-task name and the rest of
   * arguments as arguments to this sub-task. A task of any other type calls to itself.
   *
   * @typeparam TAction  Task action type.
   * @param planner  A planner to record prerequisite call(s) to.
   * @param pre  Prerequisite specifier.
   * @param details  Task call details.
   *
   * @returns A promise resolved to recorded prerequisite call.
   */
  callAsPre<TAction extends ZTaskSpec.Action>(
      planner: ZPrePlanner,
      pre: ZTaskSpec.Pre,
      details: ZCallDetails.Full<TAction>,
  ): Promise<ZCall>;

  /**
   * Plans this task execution as a top-level task.
   *
   * The plan would execute the task after executing all of its prerequisites.
   *
   * @typeparam TAction  Task action type.
   * @param details  Task call details.
   *
   * @returns A promise resolved to execution call of this task.
   *
   * @see ZPlanner.call
   */
  call(details?: ZCallDetails<TAction>): Promise<ZCall>;

  /**
   * Performs task execution.
   *
   * @param job  This task execution job.
   *
   * @returns Task execution instance.
   */
  exec(job: ZJob<TAction>): ZExecution;

}

/**
 * Task qualifier.
 *
 * Any task may have multiple qualifiers.
 *
 * Qualifiers are distinguished by their identity.
 */
export interface ZTaskQualifier {

  /**
   * Human- readable task qualifier.
   */
  readonly taskQN: string;

}
