import { noop } from '@proc7ts/primitives';
import { spawn } from 'child_process';
import * as path from 'path';
import type { ZExecution, ZJob, ZShell, ZTaskParams } from '../core';
import { AbortedZExecutionError } from '../core';
import { execZ } from '../internals';
import { colorSupportLevel, ZProgressFormat } from './impl';

/**
 * Operating system-specific task execution shell.
 */
export class SystemZShell implements ZShell {

  private readonly _format = new ZProgressFormat();

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
        childProcess.on('exit', (code, signal) => {
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
