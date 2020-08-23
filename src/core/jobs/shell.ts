/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZExecution } from '@run-z/exec-z';
import { execZNoOp } from '@run-z/exec-z';
import type { ZTaskParams } from '../plan';
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
   * @returns Command execution instance.
   */
  execCommand(job: ZJob, command: string, params: ZTaskParams): ZExecution;

  /**
   * Executes an {@link ZTaskSpec.Script NPM script}.
   *
   * @param job  The job executing NPM script.
   * @param name  The name of NPM script to execute.
   * @param params  Execution parameters.
   *
   * @returns NPM script execution instance.
   */
  execScript(job: ZJob, name: string, params: ZTaskParams): ZExecution;

}

/**
 * @internal
 */
const noopZShell: ZShell = {

  execCommand() {
    return execZNoOp();
  },

  execScript() {
    return execZNoOp();
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
