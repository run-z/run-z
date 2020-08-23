import type { ZExecution, ZExecutionStarter } from '@run-z/exec-z';
import { poolZExecutions, spawnZ } from '@run-z/exec-z';
import type { SupportedZOptions, ZOption } from '@run-z/optionz';
import { clz } from '@run-z/optionz/colors';
import { spawn } from 'child_process';
import * as path from 'path';
import type { ZJob, ZShell, ZTaskParams } from '../core';
import { RichZProgressFormat, TextZProgressFormat, ttyColorLevel, ttyColumns, ZProgressFormat } from './impl';

/**
 * Operating system-specific task execution shell.
 */
export class SystemZShell implements ZShell {

  private _exec: (this: void, starter: ZExecutionStarter) => ZExecution = poolZExecutions();
  private _format?: ZProgressFormat;

  /**
   * Constructs command line options supported by system shell.
   *
   * Supports the following options:
   *
   * `--progress` - configures the {@link setProgressFormat progress reporting format},
   * `--max-jobs` (`-j`) - configures the {@link setMaxJobs maximum number of simultaneously running jobs}.
   */
  options<TOption extends ZOption>(): SupportedZOptions<TOption> {
    return {
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
          this.setProgressFormat('rich');
          option.recognize();
        },
        meta: {
          group: '!builtin:shell:progress',
          help: 'Report execution progress',
          get description() {
            return `
${clz.param('FORMAT')} can be one of:

${clz.bullet()} ${clz.usage('rich')} or none - rich progress format,
${clz.bullet()} ${clz.usage('text')} - report progress by logging task output.

By default ${clz.usage('rich')} format is used for color terminals, and ${clz.usage('text')} otherwise.
            `;
          },
        },
      },
      '--progress=*': {
        read: (option: ZOption) => {

          const [name] = option.values();

          this.setProgressFormat(name as 'rich' | 'text');
        },
        meta: {
          aliasOf: '--progress',
          get usage() {
            return `--progress=${clz.param('FORMAT')}`;
          },
        },
      },
    };
  }

  /**
   * Assigns the maximum number of simultaneously running jobs.
   *
   * @param limit  The maximum number of simultaneously running jobs. Zero or negative value means no limit.
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
   * - `rich` or none - rich progress format.
   * - `text` - reports progress by logging task output.
   *
   * By default uses `rich` format for color terminals, and `text` otherwise.
   *
   * @param name  New progress report format name.
   *
   * @returns `this` instance.
   */
  setProgressFormat(name: 'rich' | 'text'): this {
    this._format = name === 'text' ? new TextZProgressFormat() : new RichZProgressFormat();
    return this;
  }

  execCommand(job: ZJob, command: string, params: ZTaskParams): ZExecution {
    return this._run(job, command, params.args);
  }

  execScript(job: ZJob, name: string, params: ZTaskParams): ZExecution {

    const { npm_execpath: npmPath = 'npm' } = process.env;
    const npmExt = path.extname(npmPath);
    const npmPathIsJs = /\.m?js/.test(npmExt);
    const isYarn = path.basename(npmPath, npmExt) === 'yarn';
    const command = npmPathIsJs ? process.execPath : npmPath;
    const args = npmPathIsJs ? [npmPath, 'run'] : ['run'];

    if (!isYarn) {
      args.push('--');
    }
    args.push(name, ...params.args);

    return this._run(job, command, args);
  }

  private _run(job: ZJob, command: string, args: readonly string[]): ZExecution {
    if (!this._format) {
      this._format = ttyColorLevel() ? new RichZProgressFormat() : new TextZProgressFormat();
    }

    const progress = this._format.jobProgress(job);

    return this._exec(() => {

      const spawned = spawnZ(() => {

        const childProcess = spawn(
            command,
            args,
            {
              cwd: job.call.task.target.location.path,
              env: {
                ...process.env,
                COLUMNS: String(ttyColumns()),
                FORCE_COLOR: String(ttyColorLevel()),
              },
              shell: true,
              stdio: ['ignore', 'pipe', 'pipe'],
              windowsHide: true,
            },
        );

        childProcess.stdout.on('data', chunk => progress.report(chunk));
        childProcess.stderr.on('data', chunk => progress.report(chunk, 1));

        progress.start();

        return childProcess;
      });

      return {
        whenStarted: spawned.whenStarted.bind(spawned),
        whenDone() {
          return spawned.whenDone()
              .then(
                  () => progress.reportSuccess(),
              ).catch(
                  async error => {
                    await progress.reportError(error);
                    return Promise.reject(error);
                  },
              ).finally(
                  () => progress.stop(),
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
