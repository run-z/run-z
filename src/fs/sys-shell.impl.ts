import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { ZShell } from '../core/packages';
import type { ZTaskParams } from '../core/plan';
import type { ZPackageDirectory } from './package-directory';

/**
 * @internal
 */
export class SysZShell implements ZShell {

  constructor(private readonly _dir: ZPackageDirectory) {
  }

  execCommand(command: string, params: ZTaskParams): Promise<void> {
    return this._run(command, [...params.actionArgs, ...params.args]);
  }

  execScript(name: string, params: ZTaskParams): Promise<void> {

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
    args.push(name);
    args.push(...params.actionArgs);
    args.push(...params.args);

    return this._run(command, args);
  }

  async _run(command: string, args: readonly string[]): Promise<void> {
    return new Promise((resolve, reject) => {

      const childProcess = spawn(
          command,
          args,
          {
            shell: true,
            stdio: 'inherit',
            cwd: fileURLToPath(this._dir.url),
          },
      );

      childProcess.on('error', reject);
      childProcess.on('exit', (code, signal) => {

        const error = signal || code;

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

}
