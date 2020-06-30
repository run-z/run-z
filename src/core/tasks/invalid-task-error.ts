export class InvalidZTaskError extends Error {

  constructor(
      message: string,
      readonly commandLine: string,
      readonly position: number,
  ) {
    super(message);
  }

}
