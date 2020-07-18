/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * An error thrown when task specifier syntax is invalid.
 */
export class InvalidZTaskError extends Error {

  /**
   * Constructs invalid task error.
   *
   * @param message  Error message.
   * @param commandLine  Command line containing invalid specifier.
   * @param position  Error position in command line.
   */
  constructor(
      message: string,
      readonly commandLine: string,
      readonly position: number,
  ) {
    super(message);
  }

}
