/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskSpec } from '../tasks';
import type { ZCall } from './call';

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
  readonly call: ZCall<TAction>

}
