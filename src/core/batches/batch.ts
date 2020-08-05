/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZCallPlanner } from '../plan';
import type { ZTask } from '../tasks';

/**
 * A batch of tasks.
 */
export interface ZBatch {

  /**
   * A planner of the call to the task depending on the batched ones.
   */
  readonly dependent: ZCallPlanner;

  /**
   * The name of batched tasks.
   */
  readonly taskName: string;

  /**
   * Batched tasks.
   */
  readonly batched: Iterable<ZTask>;

}
