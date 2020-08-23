/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZExecution } from '@run-z/exec-z';
import type { ZCall } from '../plan';
import type { ZTaskSpec } from '../tasks';
import type { ZShell } from './shell';

/**
 * Task execution job.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZJob<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> extends ZExecution {

  /**
   * Task execution shell this job is executed by.
   */
  readonly shell: ZShell;

  /**
   * A task call executed by this job.
   */
  readonly call: ZCall<TAction>;

  /**
   * Awaits for job to start.
   *
   * @returns A promise resolved when the job prerequisites satisfied and the work started.
   */
  whenStarted(): Promise<void>;

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

  /**
   * Aborts the job execution.
   */
  abort(): void;

}
