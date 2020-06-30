/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * An error thrown when the package can not be resolved.
 */
export class UnknownZPackageError extends Error {

  /**
   * Constructs unknown package error.
   *
   * @param packageName  Unresolved package name.
   * @param message  Error message.
   */
  constructor(readonly packageName: string, message = `Unknown package: <${packageName}>`) {
    super(message);
  }

}
