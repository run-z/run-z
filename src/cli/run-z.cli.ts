/**
 * @packageDocumentation
 * @module run-z
 */
import { ZOptionError } from '@run-z/optionz';
import { StandardZSetup } from '../builtins';
import { AbortedZExecutionError, UnknownZTaskError } from '../core';
import { SystemZShell, ZPackageDirectory } from '../os';
import { formatZOptionError } from './impl';

export function runZ(): Promise<void> {
  return doRunZ().catch(logZError);
}

/**
 * @internal
 */
async function doRunZ(): Promise<void> {

  const setup = new StandardZSetup();
  const shell = new SystemZShell();
  const currentDir = ZPackageDirectory.open();
  const target = await setup.packageResolver.get(currentDir);
  const builder = await setup.taskFactory
      .newTask(target, 'run-z')
      .applyArgv(
          process.env.npm_lifecycle_event,
          process.argv,
          {
            options: shell.options(),
          },
      );
  const task = builder.task();
  const call = await task.call();

  return call.exec(shell).whenDone();
}

/**
 * @internal
 */
function logZError(error: any): Promise<void> {
  if (error instanceof ZOptionError) {
    for (const line of formatZOptionError(error)) {
      console.error(line);
    }
  } else if (error instanceof UnknownZTaskError) {
    console.error(error.message);
  } else if (error instanceof AbortedZExecutionError) {
    console.error('Aborted with', error.abortReason);
  } else {
    console.error('Unexpected error', error);
  }
  return Promise.reject(error);
}
