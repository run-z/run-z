import { noop } from '@proc7ts/primitives';
import type { SupportedZOptions, ZOption } from '@run-z/optionz';
import { spawn } from 'child_process';
import * as path from 'path';
import type { ZExecution, ZJob, ZShell, ZTaskParams } from '../core';
import { AbortedZExecutionError } from '../core';
import { execZ } from '../internals';
import { colorSupportLevel, RichZProgressFormat, TextZProgressFormat, ZProgressFormat } from './impl';

/**
 * Operating system-specific task execution shell.
 */
export class SystemZShell implements ZShell {

  private _format?: ZProgressFormat;

  /**
   * Constructs command line options supported by system shell.
   *
   * Supports `--progress` option that configure progress reporting format. The following values accepted:
   *
   * - `rich` or none - rich color progress format.
   * - `text` - reports progress by logging output.
   *
   * By default selects `rich` format for color terminals, and `text` otherwise.
   */
  options<TOption extends ZOption>(): SupportedZOptions<TOption> {
    return {
      '--progress': {
        read: (option: ZOption) => {
          this._format = new RichZProgressFormat();
          option.recognize();
        },
        meta: {
          group: '!builtin:progress',
          help: 'Report execution progress',
        },
      },
      '--progress=*': {
        read: (option: ZOption) => {

          const [value] = option.values();

          this._format = value === 'text' ? new TextZProgressFormat() : new RichZProgressFormat();
        },
        meta: {
          aliasOf: '--progress',
          usage: [
            '--progress=text',
            '--progress=rich',
          ],
        },
      },
    };
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
      this._format = colorSupportLevel() ? new RichZProgressFormat() : new TextZProgressFormat();
    }

    const progress = this._format.jobProgress(job);

    return execZ(() => {

      const childProcess = spawn(
          command,
          args,
          {
            cwd: job.call.task.target.location.path,
            env: {
              ...process.env,
              FORCE_COLOR: String(colorSupportLevel()),
            },
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
          },
      );

      let abort = (): void => {
        childProcess.kill();
      };
      let whenDone = new Promise<void>((resolve, reject) => {

        const reportError = (error: any): void => {
          abort = noop;
          reject(error);
        };

        childProcess.on('error', reportError);
        childProcess.on('close', (code, signal) => {
          if (signal) {
            reportError(new AbortedZExecutionError(signal));
          } else if (code) {
            reportError(code > 127 ? new AbortedZExecutionError(code) : code);
          } else {
            abort = noop;
            resolve();
          }
        });

        progress.start();

        childProcess.stdout.on('data', chunk => progress.report(chunk));
        childProcess.stderr.on('data', chunk => progress.report(chunk, 1));
      }).then(
          () => progress.reportSuccess(),
      ).catch(
          async error => {
            await progress.reportError(error);
            return Promise.reject(error);
          },
      );

      whenDone = whenDone.finally(() => progress.stop());

      return {
        whenDone() {
          return whenDone;
        },
        abort() {
          abort();
        },
      };
    });
  }

}
