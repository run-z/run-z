import { ZOptionError } from '@run-z/optionz';
import { StandardZSetup } from '../builtins';
import { UnknownZTaskError } from '../core/tasks';
import { ZPackageDirectory } from '../os';
import { formatZOptionError } from './impl';

export function runZ(): Promise<never> {
  return doRunZ().then(() => process.exit(0), handleZError);
}

/**
 * @internal
 */
async function doRunZ(): Promise<void> {

  const setup = new StandardZSetup();
  const currentDir = ZPackageDirectory.open();
  const target = await setup.packageResolver.get(currentDir);
  const builder = await setup.taskFactory.newTask(target, 'run-z')
      .applyArgv(process.env.npm_lifecycle_event, process.argv);
  const task = builder.task();
  const call = await task.call();

  return call.exec().whenDone();
}

/**
 * @internal
 */
function handleZError(error: any): never {
  if (error instanceof ZOptionError) {
    for (const line of formatZOptionError(error)) {
      console.error(line);
    }
    process.exit(1);
  }
  if (error instanceof UnknownZTaskError) {
    console.error(error.message);
    process.exit(1);
  }
  console.error('Unexpected error', error);
  process.exit(1);
}
