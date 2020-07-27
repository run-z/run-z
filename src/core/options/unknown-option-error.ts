/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * An error thrown by {@link ZOptionsParser command line options parser} when unrecognized option encountered.
 */
export class UnknownZOptionError extends Error {

  /**
   * Constructs unknown option error.
   *
   * @param optionName  Unrecognized option name.
   * @param message  Error message.
   */
  constructor(
      readonly optionName: string,
      message = `Unrecognized option: "${optionName}"`,
  ) {
    super(message);
  }

}
