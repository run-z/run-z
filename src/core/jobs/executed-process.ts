/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * Arbitrary executed process that can be aborted.
 */
export interface ZExecutedProcess {

  /**
   * Awaits for the process finish.
   *
   * @returns A promise resolved when the process succeed, or rejected when it is failed.
   */
  whenDone(): Promise<void>;

  /**
   * Aborts the process.
   */
  abort(): void;

}
