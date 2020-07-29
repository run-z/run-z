/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskParams } from '../plan';

/**
 * Command execution shell.
 *
 * Each {@link ZPackageLocation package location} provides its own shell instance. The tasks of that package uses it
 * to perform their job.
 */
export interface ZShell {

  /**
   * Executes a {@link ZTaskSpec.Command command}.
   *
   * @param command  Command to execute.
   * @param params  Execution parameters.
   *
   * @returns A promise resolved when command execution succeed, or rejected when it is failed.
   */
  execCommand(command: string, params: ZTaskParams): Promise<void>;

  /**
   * Executes an {@link ZTaskSpec.Script NPM script}.
   *
   * @param name  The name of NPM script to execute.
   * @param params  Execution parameters.
   *
   * @returns A promise resolved when script execution succeed, or rejected when it is failed.
   */
  execScript(name: string, params: ZTaskParams): Promise<void>;

}

/**
 * @internal
 */
const noopZShell: ZShell = {

  execCommand(): Promise<void> {
    return Promise.resolve();
  },

  execScript(): Promise<void> {
    return Promise.resolve();
  },

};

export const ZShell = {

  /**
   * Command execution shell that does nothing.
   */
  get noop(): ZShell {
    return noopZShell;
  },

};