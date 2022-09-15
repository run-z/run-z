import { AbortedZExecutionError, FailedZExecutionError } from '@run-z/exec-z';
import { ZOptionError } from '@run-z/optionz';
import process from 'node:process';
import { StandardZSetup } from '../builtins';
import { UnknownZTaskError, ZPackageLocation, ZSetup, ZShell } from '../core';
import { SystemZShell, ZPackageDirectory } from '../os';
import { formatZOptionError } from './impl';

/**
 * `run-z` execution options.
 */
export interface RunZOpts {
  /**
   * Known task name.
   *
   * Used to reconstruct original command line when issued via `yarn run` or `npm run`.
   *
   * @default `process.env.npm_lifecycle_event`.
   *
   * @see {@link ZTaskBuilder.applyArgv}.
   */
  readonly taskName?: string | undefined;

  /**
   * An index of command line argument to start processing from.
   *
   * @default `2`.
   */
  readonly fromIndex?: number | undefined;

  /**
   * Working directory location.
   *
   * @default {@link ZPackageDirectory.open current directory}.
   */
  readonly location?: ZPackageLocation | undefined;

  /**
   * Task execution setup.
   *
   * @default New {@link StandardZSetup} instance.
   */
  readonly setup?: ZSetup | undefined;

  /**
   * Task execution shell to use.
   *
   * @default New {@link SystemZShell} instance.
   */
  readonly shell?: ZShell | undefined;
}

/**
 * Executes tasks.
 *
 * Logs execution errors.
 *
 * @param args - Command line arguments. `process.argv` by default.
 * @param opts - Execution options.
 *
 * @returns A promise resolved when execution succeeds or rejected when it is failed.
 */
export function runZ(args: readonly string[] = process.argv, opts: RunZOpts = {}): Promise<void> {
  return doRunZ(args, opts).catch(logZError);
}

/**
 * @internal
 */
async function doRunZ(
  args: readonly string[],
  {
    taskName = process.env.npm_lifecycle_event,
    fromIndex,
    location = ZPackageDirectory.open(),
    setup = new StandardZSetup(),
    shell = new SystemZShell(setup),
  }: RunZOpts,
): Promise<void> {
  const target = await setup.packageResolver.get(location);
  const builder = await setup.taskFactory.newTask(target, 'run-z').applyArgv(taskName, args, {
    fromIndex,
    options: shell.options(),
  });
  const task = builder.task();
  const call = await task.call();
  const job = call.exec(shell);

  process.on('SIGINT', () => {
    job.abort();
  });

  return job.whenDone();
}

/**
 * @internal
 */
function logZError(error: unknown): Promise<void> {
  if (error instanceof ZOptionError) {
    let offset = '';

    for (const line of formatZOptionError(error)) {
      console.error(offset + line);
      offset = '  ';
    }
  } else if (error instanceof UnknownZTaskError) {
    console.error(error.message);
  } else if (error instanceof AbortedZExecutionError) {
    console.error('Aborted with', error.abortReason);
  } else if (error instanceof FailedZExecutionError) {
    console.error('Failed with', error.failure);
  } else {
    console.error('Unexpected error', error);
  }

  return Promise.reject(error);
}
