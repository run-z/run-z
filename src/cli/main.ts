import { ZOptionError } from '@run-z/optionz';
import { EOL } from 'os';
import { promisify } from 'util';
import { StandardZSetup } from '../builtins';
import { UnknownZTaskError } from '../core';
import { ZPackageDirectory } from '../os';

runZ().catch(handleError);

async function runZ(): Promise<void> {

  const setup = new StandardZSetup();
  const currentDir = ZPackageDirectory.open();
  const target = await setup.packageResolver.get(currentDir);
  const builder = await setup.taskFactory.newTask(target, 'run-z')
      .applyArgv(process.env.npm_lifecycle_event, process.argv);
  const task = builder.task();
  const call = await task.call();

  return await call.exec().whenDone();
}

async function handleError(error: any): Promise<void> {
  if (error instanceof ZOptionError) {
    await formatZOptionError(error);
    process.exit(1);
  }
  if (error instanceof UnknownZTaskError) {
    console.error(error.message);
    process.exit(1);
  }
  console.error('Unexpected error', error);
  process.exit(1);
}

const writeErr = promisify(process.stderr.write.bind(process.stderr));

async function formatZOptionError(
    { message, optionLocation: { args, index, endIndex, offset, endOffset } }: ZOptionError,
): Promise<void> {
  args = args.slice(2);
  index -= 2;
  endIndex -= 2;

  let commandLine = '';
  let underline = '';

  for (let i = 0; i < args.length; ++i) {

    const arg = args[i];

    if (commandLine) {
      commandLine += ' ';
      if (i <= index) {
        underline += '_';
      } else if (i < endIndex - 1) {
        underline += '^';
      }
    }

    commandLine += arg;

    if (i < index) {
      underline += '_'.repeat(arg.length);
    } else if (i === index) {
      underline += '_'.repeat(offset);
      if (i === endIndex - 1) {
        underline += '^'.repeat(endOffset - offset);
      } else {
        underline += '^'.repeat(arg.length - offset);
      }
    } else if (i === endIndex - 1) {
      underline += '^'.repeat(endOffset);
    }
  }

  await writeErr(message + EOL);
  await writeErr(commandLine + EOL);
  await writeErr(underline + EOL);
}
