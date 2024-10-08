/**
 * An error thrown when unknown task executed.
 */
export class UnknownZTaskError extends Error {
  /**
   * Constructs unknown task error.
   *
   * @param packageName - Package name the task belongs to.
   * @param taskName - Unknown task name.
   * @param message - Error message.
   */
  constructor(
    readonly packageName: string,
    readonly taskName: string,
    message = `Task "${taskName}" is not known in <${packageName}>`,
  ) {
    super(message);
    this.name = 'UnknownZTaskError';
  }
}
