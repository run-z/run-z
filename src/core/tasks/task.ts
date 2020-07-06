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

  /**
   * Constructs a task.
   *
   * @param host  Host package the task is defined in.
   * @param name  Task name.
   * @param spec  Task specifier.
   */
  constructor(
      readonly host: ZPackage,
      readonly name: string,
      readonly spec: ZTaskSpec,
  ) {
  }

}
