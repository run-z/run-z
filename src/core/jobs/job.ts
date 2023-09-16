import type { ZExecution } from '@run-z/exec-z';
import { ZTaskSpec } from '../tasks/task-spec.js';
import { ZShell } from './shell.js';
import { ZCall } from '../plan/call.js';
import { ZTaskParams } from '../plan/task-params.js';

/**
 * Task execution job.
 *
 * @typeParam TAction  Task action type.
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
   * Task execution parameters.
   */
  readonly params: ZTaskParams;

  /**
   * Awaits for the job to start.
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
