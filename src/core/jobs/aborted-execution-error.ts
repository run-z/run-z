/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * Error raised when execution aborted for some predictable reason.
 *
 * E.g. when {@link ZExecutedProcess.abort} method is called.
 *
 * Rejecting with this error as reason is not considered a process failure.
 */
export class ZAbortedExecutionError extends Error {

  /**
   * Constructs aborted execution error.
   *
   * @param abortReason  A reason of abort.
   * @param message  Error message.
   */
  constructor(readonly abortReason: any, message = String(abortReason)) {
    super(message);
  }

}
