/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskParams } from '../plan';
import type { ZExecutedProcess } from './executed-process';
import { execNoopZProcess } from './impl';

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
   * @returns Executed command instance.
   */
  execCommand(command: string, params: ZTaskParams): ZExecutedProcess;

  /**
   * Executes an {@link ZTaskSpec.Script NPM script}.
   *
   * @param name  The name of NPM script to execute.
   * @param params  Execution parameters.
   *
   * @returns Executed script instance.
   */
  execScript(name: string, params: ZTaskParams): ZExecutedProcess;

}

/**
 * @internal
 */
const noopZShell: ZShell = {

  execCommand() {
    return execNoopZProcess();
  },

  execScript() {
    return execNoopZProcess();
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
