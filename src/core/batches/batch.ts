import { ZCallPlanner } from '../plan/call-planner.js';
import { ZCall } from '../plan/call.js';

/**
 * A batch of task calls.
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
   * Whether task annexes batched.
   */
  readonly isAnnex: boolean;

  /**
   * Batched task calls.
   */
  readonly batched: readonly ZCall[];
}
