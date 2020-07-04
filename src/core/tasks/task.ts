/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
import type { ZTaskSpec } from './task-spec';

/**
 * Execution task.
 */
export class ZTask {

  private readonly _spec: ZTaskSpec;

  /**
   * Constructs a task.
   *
   * @param host  Host package the task is defined in.
   * @param name  Task name.
   * @param spec  Initial task specifier.
   */
  constructor(
      readonly host: ZPackage,
      readonly name: string,
      spec: ZTaskSpec,
  ) {
    this._spec = spec;
  }

  /**
   * Task specifier.
   */
  get spec(): ZTaskSpec {
    return this._spec;
  }

}
