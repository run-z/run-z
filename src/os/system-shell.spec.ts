/* eslint-disable @typescript-eslint/no-var-requires */
import { asis, noop } from '@proc7ts/primitives';
import { AbortedZExecutionError } from '@run-z/exec-z';
import { pathToFileURL } from 'url';
import { StandardZSetup } from '../builtins';
import type { ZPackage, ZSetup } from '../core';
import { ZPackageDirectory } from './package-directory';
import { SystemZShell } from './system-shell';

const logSymbols = require('log-symbols');

const chalk = require('chalk');

describe('SystemZShell', () => {

  let shell: SystemZShell;
  let setup: ZSetup;
  let pkg: ZPackage;

  beforeEach(async () => {
    shell = new SystemZShell();

    const dir = ZPackageDirectory.open({ rootURL: pathToFileURL(process.cwd()) });

    setup = new StandardZSetup();
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

  let prevColorLevel: any;

  beforeEach(() => {
    prevColorLevel = chalk.level;
  });
  afterEach(() => {
    chalk.level = prevColorLevel;
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
    shell.setProgressFormat('rich');

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
    shell.setProgressFormat('rich');

    const task = await pkg.task('test:fail');
    const call = await task.call();

    expect(await call.exec(shell).whenDone().catch(asis)).toBe(13);
  });
  it('fails on command kill', async () => {
    shell.setProgressFormat('text');

    const task = await pkg.task('test:kill');
    const call = await task.call();

    expect(await call.exec(shell).whenDone().catch(asis)).toBeInstanceOf(AbortedZExecutionError);
  });
  it('fails on command kill with exit code', async () => {

    const task = await pkg.task('test:kill-with-code');
    const call = await task.call();

    expect(await call.exec(shell).whenDone().catch(asis)).toBeInstanceOf(AbortedZExecutionError);
  });
  it('allows to abort the job', async () => {
    shell.setProgressFormat('rich');

    const task = await pkg.task('test:stale');
    const call = await task.call();
    const job = call.exec(shell);

    await job.whenStarted();
    await new Promise(resolve => setTimeout(resolve, 250)); // Await for script to start
    job.abort();

    const error = await job.whenDone().catch(asis);

    expect(error).toBeInstanceOf(AbortedZExecutionError);
  });

  describe('options', () => {

    let writeSpy: jest.SpyInstance;

    beforeEach(() => {
      writeSpy = jest.spyOn(process.stdout, 'write');
      writeSpy.mockImplementation((_chunk: any, cb: () => void) => {
        cb();
        return true;
      });
    });
    afterEach(() => {
      writeSpy.mockRestore();
    });

    describe('--help', () => {

      let logSpy: jest.SpyInstance;

      beforeEach(() => {
        logSpy = jest.spyOn(console, 'log');
        logSpy.mockImplementation(noop);
      });
      afterEach(() => {
        logSpy.mockRestore();
      });

      it('prints shell options help', async () => {

        const builder = setup.taskFactory.newTask(pkg, '');

        await builder.parse('run-z --help', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();

        await call.exec(shell).whenDone();

        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('--progress'));
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('--max-jobs'));
      });
    });

    describe('--progress=text', () => {
      it('enables text progress format', async () => {

        const builder = setup.taskFactory.newTask(pkg, 'no-progress-reporting-task');

        await builder.parse('run-z --color --progress=text test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();

        await call.exec(shell).whenDone();

        expect(writeSpy).not.toHaveBeenCalledWith(expect.stringContaining(logSymbols.success), expect.any(Function));
      });
    });

    describe('--color', () => {
      it('enables rich progress format', async () => {

        const builder = setup.taskFactory.newTask(pkg, 'progress-reporting-task');

        await builder.parse('run-z --color test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining(logSymbols.success), expect.any(Function));
      });
    });

    describe('--no-colors', () => {
      it('enables text progress format', async () => {

        const builder = setup.taskFactory.newTask(pkg, 'no-progress-reporting-task');

        await builder.parse('run-z --no-colors test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(expect.not.stringContaining(logSymbols.success), expect.any(Function));
      });
    });

    describe('--progress', () => {
      it('enables rich progress format', async () => {

        const builder = setup.taskFactory.newTask(pkg, 'progress-reporting-task');

        await builder.parse('run-z --no-colors --progress test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining(logSymbols.success), expect.any(Function));
      });
      it('enables rich progress format without value', async () => {

        const builder = setup.taskFactory.newTask(pkg, 'progress-reporting-task');

        await builder.parse('run-z --progress --no-colors test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining(logSymbols.success), expect.any(Function));
      });
      it('reports failure', async () => {

        const builder = setup.taskFactory.newTask(pkg, 'error-reporting-task');

        await builder.parse('run-z --progress test:fail', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        expect(await job.whenDone().catch(asis)).toBeDefined();

        expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining(logSymbols.error), expect.any(Function));
      });
    });

    describe('--progress=rich', () => {
      it('enables rich progress format', async () => {

        const builder = setup.taskFactory.newTask(pkg, 'progress-reporting-task');

        await builder.parse('run-z --no-colors --progress=rich test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining(logSymbols.success), expect.any(Function));
      });
    });

    describe('--max-jobs', () => {

      let setMaxJobs: jest.SpyInstance;

      beforeEach(() => {
        setMaxJobs = jest.spyOn(shell, 'setMaxJobs');
      });
      afterEach(() => {
        setMaxJobs.mockRestore();
      });

      it('sets automatic maximum of simultaneously running jobs', async () => {

        const builder = setup.taskFactory.newTask(pkg, '');

        await builder.parse('run-z --max-jobs test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(setMaxJobs).toHaveBeenCalledWith(undefined);
      });
      it('sets specified maximum of simultaneously running jobs', async () => {

        const builder = setup.taskFactory.newTask(pkg, '');

        await builder.parse('run-z -j1 test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(setMaxJobs).toHaveBeenCalledWith(1);
      });
      it('sets specified maximum of simultaneously running jobs with `-j LIMIT`', async () => {

        const builder = setup.taskFactory.newTask(pkg, '');

        await builder.parse('run-z -j 2 test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(setMaxJobs).toHaveBeenCalledWith(2);
      });
    });
  });
});
