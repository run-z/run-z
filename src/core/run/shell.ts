/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskParams } from '../plan';

export interface ZShell {

  runCommand(command: string, params: ZTaskParams): Promise<void>;

  runScript(name: string, params: ZTaskParams): Promise<void>;

}

/**
 * @internal
 */
const noopZShell: ZShell = {

  runCommand(): Promise<void> {
    return Promise.resolve();
  },

  runScript(): Promise<void> {
    return Promise.resolve();
  },

};

export const ZShell = {

  /**
   * Task executi
   */
  get noop(): ZShell {
    return noopZShell;
  },

};
