/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZCall } from './call';

/**
 * Task execution plan.
 */
export interface ZPlan {

  /**
   * Task execution calls of this plan.
   *
   * @returns An iterable of task execution calls.
   */
  calls(): Iterable<ZCall>;

}
