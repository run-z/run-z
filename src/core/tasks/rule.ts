/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
import type { ZTaskSpec } from './task-spec';

/**
 * Execution task mutation rule.
 */
export class ZRule {

  /**
   * Constructs a task mutation rule.
   *
   * @param host  Host package the task is defined in.
   * @param pattern  A task pattern the rule is applicable to.
   * @param spec  Task mutation specifier.
   */
  constructor(
      readonly host: ZPackage,
      readonly pattern: string,
      readonly spec: ZTaskSpec,
  ) {}

}
