import { noop } from '@proc7ts/primitives';
import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { ZExecutedProcess, ZShell } from '../core/jobs';
import { ZAbortedExecutionError } from '../core/jobs';
import { execZProcess } from '../core/jobs/impl';
import type { ZTaskParams } from '../core/plan';
import type { ZPackageDirectory } from './package-directory';

/**
 * @internal
 */
export class SystemZShell implements ZShell {

  constructor(private readonly _dir: ZPackageDirectory) {
  }

  execCommand(command: string, params: ZTaskParams): ZExecutedProcess {
    return this._run(command, params.args);
  }

  execScript(name: string, params: ZTaskParams): ZExecutedProcess {

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

    return this._run(command, args);
  }

  _run(command: string, args: readonly string[]): ZExecutedProcess {
    return execZProcess(() => {

      const childProcess = spawn(
          command,
          args,
          {
            shell: true,
            stdio: 'inherit',
            cwd: fileURLToPath(this._dir.url),
          },
      );

      let abort = (): void => {
        childProcess.kill('SIGKILL');
      };
      const whenDone = new Promise<void>((resolve, reject) => {
        childProcess.on('error', error => {
          abort = noop;
          reject(error);
        });
        childProcess.on('exit', (code, signal) => {
          abort = noop;
          if (signal) {
            reject(new ZAbortedExecutionError(signal));
          } else if (code) {
            reject(code > 127 ? new ZAbortedExecutionError(code) : code);
          } else {
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
