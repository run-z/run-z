/* eslint-disable jest/no-conditional-expect */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asis, noop } from '@proc7ts/primitives';
import { AbortedZExecutionError, FailedZExecutionError } from '@run-z/exec-z';
import chalk, { ColorSupportLevel } from 'chalk';
import logSymbols from 'log-symbols';
import * as os from 'node:os';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { npmRunPath } from 'npm-run-path';
import pathKey from 'path-key';
import { StandardZSetup } from '../builtins/standard-setup.js';
import { ZPackage } from '../core/packages/package.js';
import { ZSetup } from '../core/setup.js';
import { ttyColorLevel } from './impl/tty-color-level.js';
import { ttyColumns } from './impl/tty-columns.js';
import { ZPackageDirectory } from './package-directory.js';
import { SystemZShell } from './system-shell.js';

describe('SystemZShell', () => {
  let setup: ZSetup;
  let shell: SystemZShell;
  let pkg: ZPackage;

  beforeEach(async () => {
    setup = new StandardZSetup();
    shell = new SystemZShell(setup);

    const dir = ZPackageDirectory.open({ rootURL: pathToFileURL(process.cwd()) });

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

  let prevColorLevel: ColorSupportLevel;

  beforeEach(() => {
    prevColorLevel = chalk.level;
  });
  afterEach(() => {
    chalk.level = prevColorLevel;
  });

  describe('scriptExecutable', () => {
    it('executes NPM script', async () => {
      const task = await pkg.task('test:script');
      const call = await task.call();
      const job = call.exec(shell);
      const cwd = job.call.task.target.location.path;
      const env = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        npm_execpath: 'some-package-manager',
      };

      expect(
        shell.scriptExecutable(job, 'test:script', {
          env,
        }),
      ).toEqual({
        command: 'some-package-manager',
        args: ['run', '--', 'test:script', ...job.params.args],
        cwd,
        env: {
          ...env,
          [pathKey()]: npmRunPath({ cwd }),
          COLUMNS: String(ttyColumns(env)),
          FORCE_COLOR: String(ttyColorLevel()),
        },
      });
    });
    it('executes NPM script with npm by default', async () => {
      const task = await pkg.task('test:script');
      const call = await task.call();
      const job = call.exec(shell);
      const cwd = job.call.task.target.location.path;
      const env = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        npm_execpath: undefined,
      };

      expect(
        shell.scriptExecutable(job, 'test:script', {
          env,
        }),
      ).toEqual({
        command: 'npm',
        args: ['run', '--', 'test:script', ...job.params.args],
        cwd,
        env: {
          ...env,
          [pathKey()]: npmRunPath({ cwd }),
          COLUMNS: String(ttyColumns(env)),
          FORCE_COLOR: String(ttyColorLevel()),
        },
      });

      expect(await call.exec(shell).whenDone()).toBeUndefined();
    });
    it('executes NPM script with Yarn when possible', async () => {
      const task = await pkg.task('test:script');
      const call = await task.call();
      const job = call.exec(shell);
      const cwd = job.call.task.target.location.path;
      const env = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        npm_execpath: 'yarn',
      };

      expect(
        shell.scriptExecutable(job, 'test:script', {
          env,
        }),
      ).toEqual({
        command: 'yarn',
        args: ['run', 'test:script', ...job.params.args],
        cwd,
        env: {
          ...env,
          [pathKey()]: npmRunPath({ cwd }),
          COLUMNS: String(ttyColumns(env)),
          FORCE_COLOR: String(ttyColorLevel()),
        },
      });
    });
    it('executes NPM script with node when npm_execpath points to `.js` file', async () => {
      const yarnPath = './src/spec/bin/yarn.js';
      const task = await pkg.task('test:script');
      const call = await task.call();
      const job = call.exec(shell);
      const cwd = job.call.task.target.location.path;
      const env = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        npm_execpath: yarnPath,
      };

      expect(
        shell.scriptExecutable(job, 'test:script', {
          env,
        }),
      ).toEqual({
        command: process.execPath,
        args: [yarnPath, 'run', 'test:script', ...job.params.args],
        cwd,
        env: {
          ...env,
          [pathKey()]: npmRunPath({ cwd }),
          COLUMNS: String(ttyColumns(env)),
          FORCE_COLOR: String(ttyColorLevel()),
        },
      });
    });
    it('executes NPM script with node when npm_execpath points to `.cjs` file', async () => {
      const pnpmPath = './src/spec/bin/pnpm.cjs';
      const task = await pkg.task('test:script');
      const call = await task.call();
      const job = call.exec(shell);
      const cwd = job.call.task.target.location.path;
      const env = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        npm_execpath: pnpmPath,
      };

      expect(
        shell.scriptExecutable(job, 'test:script', {
          env,
        }),
      ).toEqual({
        command: process.execPath,
        args: [pnpmPath, 'run', 'test:script', ...job.params.args],
        cwd,
        env: {
          ...env,
          [pathKey()]: npmRunPath({ cwd }),
          COLUMNS: String(ttyColumns(env)),
          FORCE_COLOR: String(ttyColorLevel()),
        },
      });
    });
  });

  describe('commandExecutable', () => {
    it('executes command', async () => {
      const task = await pkg.task('test:command');
      const call = await task.call();
      const job = call.exec(shell);
      const cwd = job.call.task.target.location.path;
      const env = process.env;

      expect(shell.commandExecutable(job, 'node')).toEqual({
        command: 'node',
        args: job.params.args,
        cwd,
        env: {
          ...env,
          [pathKey()]: npmRunPath({ cwd }),
          COLUMNS: String(ttyColumns(env)),
          FORCE_COLOR: String(ttyColorLevel()),
          NODE_OPTIONS: '--no-warnings --no-deprecation',
        },
      });
    });
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
    const error = await call.exec(shell).whenDone().catch(asis);

    expect(error).toBeInstanceOf(FailedZExecutionError);
    expect(error.failure).toBe(13);
  });
  it('aborts on command kill', async () => {
    shell.setProgressFormat('text');

    const task = await pkg.task('test:kill');
    const call = await task.call();
    const error = await call.exec(shell).whenDone().catch(asis);

    if (os.platform() === 'win32') {
      // No way to kill with signal under Windows
      expect(error).toBeInstanceOf(FailedZExecutionError);
    } else {
      expect(error).toBeInstanceOf(AbortedZExecutionError);
    }
  });
  it('fails on command kill with exit code', async () => {
    const task = await pkg.task('test:kill-with-code');
    const call = await task.call();
    const error = await call.exec(shell).whenDone().catch(asis);

    expect(error).toBeInstanceOf(AbortedZExecutionError);
  });
  it('allows to abort the job', async () => {
    shell.setProgressFormat('rich');

    const task = await pkg.task('test:stale');
    const call = await task.call();
    const job = call.exec(shell);

    await job.whenStarted();
    job.abort();

    const error = await job.whenDone().catch(asis);

    if (os.platform() === 'win32') {
      // No way to kill with signal under Windows
      expect(error).toBeInstanceOf(FailedZExecutionError);
    } else {
      expect(error).toBeInstanceOf(AbortedZExecutionError);
    }
  });

  describe('options', () => {
    let writeSpy: jest.Mock<(chunk: Uint8Array | string, cb?: any) => boolean>;

    beforeEach(() => {
      writeSpy = jest.spyOn(process.stdout, 'write') as typeof writeSpy;
      writeSpy.mockImplementation((_chunk, cb) => {
        cb();

        return true;
      });
    });
    afterEach(() => {
      writeSpy.mockRestore();
    });

    describe('--help', () => {
      let logSpy: jest.Mock<(...args: unknown[]) => void>;

      beforeEach(() => {
        logSpy = jest.spyOn(console, 'log') as typeof logSpy;
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

        await builder.parse('run-z --color --progress=text test:script', {
          options: shell.options(),
        });

        const task = builder.task();
        const call = await task.call();

        await call.exec(shell).whenDone();

        expect(writeSpy).not.toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
      it('enables text progress format in shorter form', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'no-progress-reporting-task');

        await builder.parse('run-z --color -gtext test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();

        await call.exec(shell).whenDone();

        expect(writeSpy).not.toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
    });

    describe('--color', () => {
      it('enables text progress format', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'no-progress-reporting-task');

        await builder.parse('run-z --color test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();

        await call.exec(shell).whenDone();

        expect(writeSpy).not.toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
    });

    describe('--color --progress', () => {
      it('enables rich progress format', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'progress-reporting-task');

        await builder.parse('run-z --color --progress test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
    });

    describe('--color -g', () => {
      it('enables rich progress format', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'progress-reporting-task');

        await builder.parse('run-z --color -g test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
    });

    describe('--no-colors --progress', () => {
      it('enables text progress format', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'no-progress-reporting-task');

        await builder.parse('run-z --no-colors --progress test:script', {
          options: shell.options(),
        });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).not.toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
    });

    describe('--no-colors -g', () => {
      it('enables text progress format', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'no-progress-reporting-task');

        await builder.parse('run-z --no-colors -g test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).not.toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
    });

    describe('--color --progress=auto', () => {
      it('enables rich progress format', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'progress-reporting-task');

        await builder.parse('run-z --color --progress=auto test:script', {
          options: shell.options(),
        });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
    });

    describe('--color -gauto', () => {
      it('enables rich progress format', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'progress-reporting-task');

        await builder.parse('run-z --color -gauto test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
    });

    describe('--no-colors --progress=auto', () => {
      it('enables text progress format', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'no-progress-reporting-task');

        await builder.parse('run-z --no-colors --progress=auto test:script', {
          options: shell.options(),
        });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).not.toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
    });

    describe('--no-colors -gauto', () => {
      it('enables text progress format', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'no-progress-reporting-task');

        await builder.parse('run-z --no-colors -gauto test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).not.toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
    });

    describe('--progress=rich', () => {
      it('enables rich progress format', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'progress-reporting-task');

        await builder.parse('run-z --no-colors --progress=rich test:script', {
          options: shell.options(),
        });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
      it('enables rich progress format in shorter form', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'progress-reporting-task');

        await builder.parse('run-z --no-colors -grich test:script', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
      it('enables rich progress format without colors', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'progress-reporting-task');

        await builder.parse('run-z --progress=rich --no-colors test:script', {
          options: shell.options(),
        });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.success) as unknown as string,
          expect.any(Function),
        );
      });
      it('reports failure', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'error-reporting-task');

        await builder.parse('run-z --progress=rich test:fail', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);
        const error = await job.whenDone().catch(asis);

        expect(error).toBeInstanceOf(FailedZExecutionError);
        expect(error.failure).toBe(13);

        expect(writeSpy).toHaveBeenCalledWith(
          expect.stringContaining(logSymbols.error) as unknown as string,
          expect.any(Function),
        );
      });
      it('displays status when silent task succeeds', async () => {
        const builder = setup.taskFactory.newTask(pkg, 'silently-reporting-task');

        await builder.parse('run-z --progress=rich test:silent', { options: shell.options() });

        const task = builder.task();
        const call = await task.call();
        const job = call.exec(shell);

        await job.whenDone();

        expect(writeSpy).toHaveBeenCalledWith(
          expect.stringContaining(' Ok') as unknown as string,
          expect.any(Function),
        );
      });
    });

    describe('--max-jobs', () => {
      let setMaxJobs: jest.Mock<SystemZShell['setMaxJobs']>;

      beforeEach(() => {
        setMaxJobs = jest.spyOn(shell, 'setMaxJobs') as typeof setMaxJobs;
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
