import { asis } from '@proc7ts/primitives';
import { pathToFileURL } from 'url';
import { StandardZSetup } from '../builtins';
import { ZAbortedExecutionError, ZPackage } from '../core';
import { ZPackageDirectory } from './package-directory';
import { SystemZShell } from './system-shell';

describe('SystemZShell', () => {

  let shell: SystemZShell;
  let pkg: ZPackage;

  beforeEach(async () => {
    shell = new SystemZShell();

    const dir = ZPackageDirectory.open({ rootURL: pathToFileURL(process.cwd()) });
    const setup = new StandardZSetup();

    pkg = await setup.packageResolver.get(dir);
  });

  let prevNpmPath: string | undefined;

  beforeEach(() => {
    prevNpmPath = process.env.npm_execpath;
  });
  afterEach(() => {
    if (!prevNpmPath) {
      delete process.env.npm_execpath;
    } else {
      process.env.npm_execpath = prevNpmPath;
    }
  });

  it('executes NPM script', async () => {

    const task = await pkg.task('test:script');
    const call = await task.call();

    expect(await call.exec(shell).whenDone()).toBeUndefined();
  });
  it('executes NPM script with npm by default', async () => {
    delete process.env.npm_execpath;

    const task = await pkg.task('test:script');
    const call = await task.call();

    expect(await call.exec(shell).whenDone()).toBeUndefined();
  });
  it('executes NPM script with Yarn when possible', async () => {
    process.env.npm_execpath = 'yarn';

    const task = await pkg.task('test:script');
    const call = await task.call();

    expect(await call.exec(shell).whenDone()).toBeUndefined();
  });
  it('executes NPM script with node when npm_execpath points to `.js` file', async () => {
    process.env.npm_execpath = './src/spec/bin/yarn.js';

    const task = await pkg.task('test:script');
    const call = await task.call();

    expect(await call.exec(shell).whenDone()).toBeUndefined();
  });
  it('executes command', async () => {

    const task = await pkg.task('test:command');
    const call = await task.call();

    expect(await call.exec(shell).whenDone()).toBeUndefined();
  });
  it('executes all tasks', async () => {

    const task = await pkg.task('test:all');
    const call = await task.call();

    expect(await call.exec(shell).whenDone()).toBeUndefined();
  });
  it('fails on command failure', async () => {

    const task = await pkg.task('test:fail');
    const call = await task.call();

    expect(await call.exec(shell).whenDone().catch(asis)).toBe(13);
  });
  it('fails on command kill', async () => {

    const task = await pkg.task('test:kill');
    const call = await task.call();

    expect(await call.exec(shell).whenDone().catch(asis)).toBeInstanceOf(ZAbortedExecutionError);
  });
  it('fails on command kill with exist code', async () => {

    const task = await pkg.task('test:kill-with-code');
    const call = await task.call();

    expect(await call.exec(shell).whenDone().catch(asis)).toBeInstanceOf(ZAbortedExecutionError);
  });
  it('allows to abort the job', async () => {

    const task = await pkg.task('test:stale');
    const call = await task.call();
    const job = call.exec(shell);

    await job.whenStarted();
    job.abort();

    const error = await job.whenDone().catch(asis);

    expect(error).toBeInstanceOf(ZAbortedExecutionError);
  });
});
