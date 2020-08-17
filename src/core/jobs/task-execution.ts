/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskSpec } from '../tasks';
import type { ZJob } from './job';
import type { ZShell } from './shell';

/**
 * Task execution context.
 *
 * This is passed to {@link ZTask.exec} when the task is executed.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZTaskExecution<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  /**
   * Task execution shell to use.
   */
  readonly shell: ZShell;

  /**
   * Task execution jobs.
   */
  readonly job: ZJob<TAction>;

}
