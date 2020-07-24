/**
 * @packageDocumentation
 * @module run-z
 */

export class UnknownZOptionError extends Error {

  constructor(
      readonly optionName: string,
      message = `Unrecognized option ${optionName}`,
  ) {
    super(message);
  }

}
