import { ZOptionError } from '@run-z/optionz';
import { UnknownZTaskError, ZSetup } from '../core';
import { ZPackageDirectory } from '../os';

runZ().catch(handleError);

async function runZ(): Promise<void> {

  const setup = new ZSetup();
  const currentDir = ZPackageDirectory.open();
  const target = await setup.packageResolver.get(currentDir);
  const builder = await setup.taskFactory.newTask(target, 'run-z')
      .applyArgv(process.env.npm_lifecycle_event, process.argv);
  const task = builder.task();
  const call = await task.call();

  return await call.exec().whenDone();
}

function handleError(error: any): void {
  if (error instanceof ZOptionError) {
    console.error(error.message);
    // console.error('>', error.commandLine);
    // console.error('>', ' '.repeat(error.position) + '^');
    process.exit(1);
  }
  if (error instanceof UnknownZTaskError) {
    console.error(error.message);
    process.exit(1);
  }
  console.error('Unexpected error', error);
  process.exit(1);
}
