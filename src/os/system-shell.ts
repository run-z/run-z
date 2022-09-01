import { arrayOfElements, lazyValue } from '@proc7ts/primitives';
import type { ZExecution, ZExecutionStarter } from '@run-z/exec-z';
import { poolZExecutions, spawnZ } from '@run-z/exec-z';
import { zlogDetails } from '@run-z/log-z';
import type { ZOption } from '@run-z/optionz';
import { clz } from '@run-z/optionz/colors';
import spawn from 'cross-spawn';
import type { ChildProcessByStdio } from 'node:child_process';
import * as path from 'node:path';
import type { Readable } from 'node:stream';
import { npmRunPath } from 'npm-run-path';
import pathKey from 'path-key';
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
          read: SystemZShell$readMaxJobs.bind(this),
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
          read: SystemZShell$readMaxJobs.bind(this),
          meta: {
            aliasOf: '--max-jobs',
            get usage() {
              return `-j${clz.param('LIMIT')}`;
            },
          },
        },
        '-j': {
          read: SystemZShell$readMaxJobs.bind(this),
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
${clz.bullet()} ${clz.usage('auto')} or none - use ${clz.usage(
                'rich',
              )} format for color terminals, or ${clz.usage('text')} otherwise.

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
    this._format
      = name === 'rich'
        ? lazyValue(zProgressFormats.rich)
        : name === 'auto'
        ? lazyValue(zProgressFormats.auto)
        : lazyValue(zProgressFormats.text);

    return this;
  }

  execCommand(job: ZJob, command: string): ZExecution {
    return this._run(job, this.commandExecutable(job, command));
  }

  /**
   * Creates a {@link ZTaskSpec.Command command} executable.
   *
   * @param job - The job executing a command.
   * @param job - The job executing command.
   * @param command - Command to execute.
   * @param name - The name of NPM script to execute.
   * @param env - Environment variables. `process.env` by default.
   *
   * @returns New executable.
   */
  commandExecutable(
    job: ZJob,
    command: string,
    {
      env = process.env,
    }: {
      env?: ProcessEnv | undefined;
    } = {},
  ): SystemZExecutable {
    return this._buildExecutable(job, {
      command,
      args: job.params.args,
      env,
    });
  }

  execScript(job: ZJob, name: string): ZExecution {
    return this._run(job, this.scriptExecutable(job, name));
  }

  /**
   * Creates an {@link ZTaskSpec.Script NPM script} executable.
   *
   * @param job - The job executing NPM script.
   * @param name - The name of NPM script to execute.
   * @param env - Environment variables. `process.env` by default.
   *
   * @returns New executable.
   */
  scriptExecutable(
    job: ZJob,
    name: string,
    {
      env = process.env,
    }: {
      env?: ProcessEnv | undefined;
    } = {},
  ): SystemZExecutable {
    const { npm_execpath: npmPath = 'npm' } = env;
    const npmExt = path.extname(npmPath);
    const npmBase = path.basename(npmPath, npmExt);
    const npmPathIsJs = /\.[cm]?js/.test(npmExt);
    let command: string;
    let args: string[];

    if (npmPathIsJs) {
      command = process.execPath; // /usr/bin/node
      args = [npmPath /* ./path/to/npm.js */, 'run'];
    } else {
      command = npmPath; // npm
      args = ['run'];
    }

    if (npmBase !== 'yarn' && npmBase !== 'pnpm') {
      // Yarn discourages the usage of `--` after the command name.
      // NPM requires it.
      // PNPM v7 forbids it, as it tries to interpret subsequent options otherwise.
      args.push('--');
    }

    args.push(name, ...job.params.args);

    return this._buildExecutable(job, { command, args, env });
  }

  private _buildExecutable(
    job: ZJob,
    {
      command,
      args,
      env,
    }: {
      command: string;
      args: readonly string[];
      env: ProcessEnv;
    },
  ): SystemZExecutable {
    const cwd = job.call.task.target.location.path;

    return {
      command,
      args,
      cwd,
      env: {
        ...env,
        [pathKey()]: npmRunPath({ cwd }),
        COLUMNS: String(ttyColumns(env)),
        FORCE_COLOR: String(ttyColorLevel()),
        ...SystemZShell$attrEnv(job),
      },
    };
  }

  private _run(job: ZJob, { command, args, cwd, env }: SystemZExecutable): ZExecution {
    const progress = this._format().jobProgress(job);

    return this._exec(() => {
      const spawned = spawnZ(
        () => {
          const childProcess = spawn(command, args, {
            cwd,
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
          }) as ChildProcessByStdio<null, Readable, Readable>;

          childProcess.stdout.on('data', (chunk: string | Buffer) => progress.log.info(chunk.toString()));
          childProcess.stderr.on('data', (chunk: string | Buffer) => progress.log.error(chunk.toString()));

          progress.start();

          return childProcess;
        },
        {
          kill(proc) {
            kill(proc.pid!, 'SIGKILL');
          },
        },
      );

      return {
        whenStarted: spawned.whenStarted.bind(spawned),
        whenDone() {
          return spawned
            .whenDone()
            .then(() => {
              progress.stop();
              progress.log.info(zlogDetails({ success: true }));
            })
            .catch(error => {
              progress.stop();
              progress.log.error(zlogDetails({ error }));

              return Promise.reject(error);
            });
        },
        abort: spawned.abort.bind(spawned),
      };
    });
  }

}

/**
 * A command executable by system shell.
 */
export interface SystemZExecutable {
  /**
   * A command to execute.
   */
  readonly command: string;

  /**
   * Command line arguments.
   */
  readonly args: readonly string[];

  /**
   * A working directory of the command.
   */
  readonly cwd: string;

  /**
   * Environment variables to apply.
   */
  readonly env: ProcessEnv;
}

function SystemZShell$readMaxJobs(this: SystemZShell, option: ZOption): void {
  const [value] = option.values();
  let limit: number | undefined = parseInt(value, 10);

  if (isNaN(limit)) {
    // Not a number
    limit = undefined;
    option.values(0);
  }

  this.setMaxJobs(limit);
}

function SystemZShell$attrEnv(job: ZJob): Record<string, string> {
  const env = new Map<string, Set<string>>();

  for (const [attr, value] of job.params.allAttrs('env')) {
    const envName = attr.substr(4); // Remove `env:` prefix

    if (envName) {
      const prevValues = env.get(envName);

      if (prevValues) {
        // Add as last
        prevValues.delete(value);
        prevValues.add(value);
      } else {
        env.set(envName, new Set<string>().add(value));
      }
    }
  }

  const result: Record<string, string> = {};

  for (const [envName, values] of env) {
    result[envName] = [...values].join(' ');
  }

  return result;
}
