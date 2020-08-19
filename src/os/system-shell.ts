import * as path from 'path';
import type { ZExecution, ZJob, ZShell, ZTaskParams } from '../core';
import { ZShellRunner } from './impl';

/**
 * Operating system-specific task execution shell.
 */
export class SystemZShell implements ZShell {

  private readonly _runner = new ZShellRunner();

  execCommand(job: ZJob, command: string, params: ZTaskParams): ZExecution {
    return this._runner.run(job, command, params.args);
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

    return this._runner.run(job, command, args);
  }

}
