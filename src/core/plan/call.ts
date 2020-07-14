/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZTaskParams } from './task-params';

/**
 * A call for task execution.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZCall<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  /**
   * A task to call.
   */
  readonly task: ZTask<TAction>;

  /**
   * Evaluates task execution parameters.
   *
   * @returns Task execution parameters instance.
   */
  params(): ZTaskParams;

  /**
   * Extends this call parameters with the given extension.
   *
   * @param extension  Task parameters extension.
   *
   * @returns Extended task parameters evaluator.
   */
  extendParams(extension: ZTaskParams.Partial): (this: void) => ZTaskParams;

}

/**
 * Task execution parameters evaluator signature.
 */
export type ZCallParams =
/**
 * @returns Partial task execution parameters.
 */
    (this: void) => ZTaskParams.Partial;

/**
 * Task execution call depth evaluator signature.
 *
 * This is a function that evaluates the depth of the call. The higher the call depth, the less the priority of
 * the {@link ZTaskParams call parameters} is.
 */
export type ZCallDepth =
/**
 * @returns The depth of the call.
 */
    (this: void) => number;
