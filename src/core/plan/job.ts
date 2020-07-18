/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskSpec } from '../tasks';
import type { ZCall } from './call';

/**
 * Task execution job.
 *
 * Represents executed task.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZJob<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  /**
   * A task call executed by this job.
   */
  readonly call: ZCall<TAction>;

  /**
   * Awaits for the job finish.
   *
   * @returns A promise resolved when the job succeed, or rejected when it is failed.
   */
  whenFinished(): Promise<void>;

  /**
   * Awaits for the job done.
   *
   * @returns A promise resolved when the job and all of its {@link ZCall.prerequisites prerequisite} execution jobs
   * succeed, or rejected when any of them failed.
   */
  whenDone(): Promise<void>;

}
