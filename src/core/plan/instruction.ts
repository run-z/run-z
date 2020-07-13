/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPlanRecorder } from './plan-recorder';

/**
 * Task execution instruction signature.
 *
 * This can be {@link ZPlanRecorder.follow recorded} to task execution plan.
 */
export type ZInstruction =
/**
 * @param recorder  Execution plan recorder to record further instructions to.
 *
 * @returns Either nothing when instruction recorded synchronously, or a promise-like instance resolved when
 * instruction is recorded asynchronously.
 */
    (this: void, recorder: ZPlanRecorder) => void | PromiseLike<unknown>;
