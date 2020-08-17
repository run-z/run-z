/**
 * @packageDocumentation
 * @module run-z
 */
import { execNoopZProcess } from '../../internals';
import type { ZTaskParams } from '../plan';
import type { ZExecutedProcess } from './executed-process';
import type { ZJob } from './job';

/**
 * Task execution shell.
 *
 * It is provided is used by {@link ZCall.exec task execution jobs} to execute commands.
 */
export interface ZShell {

  /**
   * Executes a {@link ZTaskSpec.Command command}.
   *
   * @param job  The job executing command.
   * @param command  Command to execute.
   * @param params  Execution parameters.
   *
   * @returns Executed command instance.
   */
  execCommand(job: ZJob, command: string, params: ZTaskParams): ZExecutedProcess;

  /**
   * Executes an {@link ZTaskSpec.Script NPM script}.
   *
   * @param job  The job executing NPM script.
   * @param name  The name of NPM script to execute.
   * @param params  Execution parameters.
   *
   * @returns Executed script instance.
   */
  execScript(job: ZJob, name: string, params: ZTaskParams): ZExecutedProcess;

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
   * Task execution shell that does nothing.
   */
  get noop(): ZShell {
    return noopZShell;
  },

};
