import { noop } from '@proc7ts/primitives';
import { spawn } from 'child_process';
import * as path from 'path';
import type { ZExecutedProcess, ZJob, ZShell, ZTaskParams } from '../core';
import { ZAbortedExecutionError } from '../core';
import { execZProcess } from '../internals';

/**
 * Operating system-specific task execution shell.
 */
export class SystemZShell implements ZShell {

  execCommand(job: ZJob, command: string, params: ZTaskParams): ZExecutedProcess {
    return this._run(job, command, params.args);
  }

  execScript(job: ZJob, name: string, params: ZTaskParams): ZExecutedProcess {

    // eslint-disable-next-line @typescript-eslint/naming-convention
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

  _run(job: ZJob, command: string, args: readonly string[]): ZExecutedProcess {
    return execZProcess(() => {

      const childProcess = spawn(
          command,
          args,
          {
            shell: true,
            stdio: 'inherit',
            cwd: job.call.task.target.location.path,
          },
      );

      let abort = (): void => {
        childProcess.kill();
      };
      const whenDone = new Promise<void>((resolve, reject) => {

        const reportError = (error: any): void => {
          abort = noop;
          reject(error);
        };

        childProcess.on('error', reportError);
        childProcess.on('exit', (code, signal) => {
          if (signal) {
            reportError(new ZAbortedExecutionError(signal));
          } else if (code) {
            reportError(code > 127 ? new ZAbortedExecutionError(code) : code);
          } else {
            abort = noop;
            resolve();
          }
        });
      });

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
