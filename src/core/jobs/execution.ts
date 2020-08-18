/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * Arbitrary process execution that can be aborted.
 */
export interface ZExecution {

  /**
   * Awaits for execution to finish.
   *
   * @returns A promise resolved when execution succeed, or rejected when it is failed.
   */
  whenDone(): Promise<void>;

  /**
   * Aborts the execution.
   */
  abort(): void;

}
