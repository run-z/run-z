import { arrayOfElements, lazyValue } from '@proc7ts/primitives';
import type { ZExecution, ZExecutionStarter } from '@run-z/exec-z';
import { poolZExecutions, spawnZ } from '@run-z/exec-z';
import { zlogDetails, zlogError } from '@run-z/log-z';
import type { ZOption } from '@run-z/optionz';
import { clz } from '@run-z/optionz/colors';
import type { ChildProcessByStdio } from 'child_process';
import spawn from 'cross-spawn';
import npmRunPath from 'npm-run-path';
import * as path from 'path';
import pathKey from 'path-key';
import type { Readable } from 'stream';
import kill from 'tree-kill';
import type { ZJob } from '../core';
import { ZShell, ZTaskParser } from '../core';
import { ttyColorLevel, ttyColumns, ZProgressFormat } from './impl';
import { RichZProgressFormat } from './impl/rich';
import { TextZProgressFormat } from './impl/text';
import ProcessEnv = NodeJS.ProcessEnv;

/**
 * @internal
 */
const zProgressFormats = {
  auto(this: void) {
    return ttyColorLevel() ? new RichZProgressFormat() : new TextZProgressFormat();
  },
  rich(this: void) {
    return new RichZProgressFormat();
  },
  text(this: void) {
    return new TextZProgressFormat();
  },
};

/**
 * Operating system-specific task execution shell.
 */
export class SystemZShell extends ZShell {

  private _exec: (this: void, starter: ZExecutionStarter) => ZExecution = poolZExecutions();
  private _format: (this: void) => ZProgressFormat = lazyValue(zProgressFormats.text);

  /**
   * Constructs command line options supported by system shell.
   *
   * Supports the following options:
   *
   * `--progress` - configures the {@link setProgressFormat progress reporting format},
   * `--max-jobs` (`-j`) - configures the {@link setMaxJobs maximum number of simultaneously running jobs}.
   */
  options(): ZTaskParser.SupportedOptions {
    return [
      ...arrayOfElements(super.options()),
      {
        '--max-jobs': {
          read: readMaxZJobs.bind(this),
          meta: {
            group: '!builtin:shell:max-jobs',
            get usage() {
              return `--max-jobs ${clz.optional(clz.param('LIMIT'))}`;
            },
            help: 'Set the maximum of simultaneously running jobs',
            get description() {
              return `
Zero or negative ${clz.param('LIMIT')} means no limit.

Defaults to the number of CPUs when no ${clz.param('LIMIT')} set.
            `;
            },
          },
        },
        '-j*': {
          read: readMaxZJobs.bind(this),
          meta: {
            aliasOf: '--max-jobs',
            get usage() {
              return `-j${clz.param('LIMIT')}`;
            },
          },
        },
        '-j': {
          read: readMaxZJobs.bind(this),
          meta: {
            hidden: true,
          },
        },
        '--progress': {
          read: (option: ZOption) => {
            this.setProgressFormat('auto');
            option.recognize();
          },
          meta: {
            group: '!builtin:shell:progress',
            help: 'Report execution progress',
            get description() {
              return `
${clz.param('FORMAT')} can be one of:

${clz.bullet()} ${clz.usage('rich')} - rich progress format,
${clz.bullet()} ${clz.usage('text')} - report progress by logging task output,
${clz.bullet()} ${clz.usage('auto')} or none - use ${clz.usage('rich')} format for color terminals, or ${
                clz.usage('text')} otherwise.

By default ${clz.usage('text')} format is used.
            `;
            },
          },
        },
        '--progress=*': {
          read: (option: ZOption) => {

            const [name] = option.values();

            this.setProgressFormat(name as 'rich' | 'text' | 'auto');
          },
          meta: {
            aliasOf: '--progress',
            get usage() {
              return `--progress=${clz.param('FORMAT')}`;
            },
          },
        },
        '-g': {
          read: (option: ZOption) => {
            this.setProgressFormat('auto');
            option.recognize();
          },
          meta: {
            aliasOf: '--progress',
          },
        },
        '-g*': {
          read: (option: ZOption) => {

            const [name] = option.values();

            this.setProgressFormat(name as 'rich' | 'text' | 'auto');
          },
          meta: {
            aliasOf: '--progress',
            get usage() {
              return `-g${clz.param('FORMAT')}`;
            },
          },
        },
      },
    ];
  }

  /**
   * Assigns the maximum number of simultaneously running jobs.
   *
   * @param limit - The maximum number of simultaneously running jobs. Zero or negative value means no limit.
   * Equals to the number of CPUs by default.
   *
   * @returns `this` instance.
   */
  setMaxJobs(limit: number | undefined): this {
    this._exec = poolZExecutions(limit);
    return this;
  }

  /**
   * Assigns format of execution progress report.
   *
   * The following values accepted:
   *
   * - `rich` - rich progress format.
   * - `text` - reports progress by logging task output
   * - `auto` or none - rich format for color terminals, or text one otherwise.
   *
   * By default uses `text` format.
   *
   * @param name - New progress report format name.
   *
   * @returns `this` instance.
   */
  setProgressFormat(name: 'rich' | 'text' | 'auto'): this {
    this._format = name === 'rich'
        ? lazyValue(zProgressFormats.rich)
        : name === 'auto'
            ? lazyValue(zProgressFormats.auto)
            : lazyValue(zProgressFormats.text);
    return this;
  }

  execCommand(job: ZJob, command: string): ZExecution {
    return this._run(job, command, ...job.params.args);
  }

  execScript(job: ZJob, name: string): ZExecution {
    return this._run(job, ...this.scriptCommand(job, name));
  }

  /**
   * Builds a command to execute a script.
   *
   * @param job - The job executing NPM script.
   * @param name - The name of NPM script to execute.
   * @param env - Environment variables. `process.env` by default.
   *
   * @returns Command line arguments.
   */
  scriptCommand(
      job: ZJob,
      name: string,
      {
        env = process.env,
      }: {
        env?: ProcessEnv;
      } = {},
  ): readonly [command: string, ...args: string[]] {

    const { npm_execpath: npmPath = 'npm' } = env;
    const npmExt = path.extname(npmPath);
    const npmBase = path.basename(npmPath, npmExt);
    const npmPathIsJs = /\.m?js/.test(npmExt);
    const command: [string, ...string[]] = npmPathIsJs
        ? [process.execPath /* /usr/bin/node */, npmPath /* ./path/to/npm.js */, 'run']
        : [npmPath /* npm */, 'run'];

    if (npmBase !== 'yarn') {
      // Yarn discourages the usage of `--` after the command name.
      // NPM requires it.
      // PNPM prefers it, as it tries to interpret subsequent options otherwise.
      command.push('--');
    }

    command.push(name, ...job.params.args);

    return command;
  }

  private _run(job: ZJob, command: string, ...args: string[]): ZExecution {

    const progress = this._format().jobProgress(job);

    return this._exec(() => {

      const spawned = spawnZ(
          () => {

            const cwd = job.call.task.target.location.path;
            const childProcess = spawn(
                command,
                args,
                {
                  cwd,
                  env: {
                    ...process.env,
                    [pathKey()]: npmRunPath({ cwd }),
                    COLUMNS: String(ttyColumns()),
                    FORCE_COLOR: String(ttyColorLevel()),
                  },
                  stdio: ['ignore', 'pipe', 'pipe'],
                  windowsHide: true,
                },
            ) as ChildProcessByStdio<null, Readable, Readable>;

            childProcess.stdout.on('data', (chunk: string | Buffer) => progress.log.info(chunk.toString()));
            childProcess.stderr.on('data', (chunk: string | Buffer) => progress.log.error(chunk.toString()));

            progress.start();

            return childProcess;
          },
          {
            kill(proc) {
              kill(proc.pid, 'SIGKILL');
            },
          },
      );

      return {
        whenStarted: spawned.whenStarted.bind(spawned),
        whenDone() {
          return spawned.whenDone()
              .then(
                  () => {
                    progress.stop();
                    progress.log.info(zlogDetails({ success: true }));
                  },
              ).catch(
                  error => {
                    progress.stop();
                    progress.log.error(String(error), zlogError(error));
                    return Promise.reject(error);
                  },
              );
        },
        abort: spawned.abort.bind(spawned),
      };
    });
  }

}

/**
 * @internal
 */
function readMaxZJobs(this: SystemZShell, option: ZOption): void {

  const [value] = option.values();
  let limit: number | undefined = parseInt(value, 10);

  if (isNaN(limit)) {
    // Not a number
    limit = undefined;
    option.values(0);
  }

  this.setMaxJobs(limit);
}
