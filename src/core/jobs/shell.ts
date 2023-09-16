import { asArray } from '@proc7ts/primitives';
import type { ZExecution } from '@run-z/exec-z';
import { execZNoOp } from '@run-z/exec-z';
import type { ZSetup } from '../setup';
import type { ZTaskParser } from '../tasks';
import type { ZJob } from './job';

/**
 * Task execution shell.
 *
 * It is provided is used by {@link ZCall.exec task execution jobs} to execute commands.
 */
export abstract class ZShell {

  /**
   * Creates task execution shell that does nothing.
   *
   * @param setup - Task execution setup.
   *
   * @returns New task execution shell.
   */
  static noop(setup: ZSetup): ZShell {
    return new NoOpZShell(setup);
  }

  /**
   * Constructs task execution shell.
   *
   * @param setup - Task execution setup.
   */
  constructor(readonly setup: ZSetup) {}

  /**
   * Executes a {@link ZTaskSpec.Command command}.
   *
   * @param job - The job executing command.
   * @param command - Command to execute.
   *
   * @returns Command execution instance.
   */
  abstract execCommand(job: ZJob, command: string): ZExecution;

  /**
   * Executes an {@link ZTaskSpec.Script NPM script}.
   *
   * @param job - The job executing NPM script.
   * @param name - The name of NPM script to execute.
   *
   * @returns NPM script execution instance.
   */
  abstract execScript(job: ZJob, name: string): ZExecution;

  /**
   * Constructs command line options supported by system shell.
   *
   * Includes options supported by {@link ZExtension.shellOptions extensions}.
   */
  options(): ZTaskParser.SupportedOptions {
    return this.setup.extensions.flatMap(({ shellOptions }) => asArray(shellOptions));
  }

}

/**
 * @internal
 */
class NoOpZShell extends ZShell {

  execCommand(): ZExecution {
    return execZNoOp();
  }

  execScript(): ZExecution {
    return execZNoOp();
  }

}
