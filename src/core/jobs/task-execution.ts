/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZCall } from '../plan';
import type { ZTaskSpec } from '../tasks';

/**
 * Task execution context.
 *
 * This is passed to {@link ZTask.exec} when the task is executed.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZTaskExecution<TAction extends ZTaskSpec.Action> {

  /**
   * Executed task call.
   */
  readonly call: ZCall<TAction>;

}
