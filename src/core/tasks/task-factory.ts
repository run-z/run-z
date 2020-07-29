/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
import { ZTaskBuilder$ } from './impl/task-builder';
import type { ZTaskBuilder } from './task-builder';

/**
 * Task factory.
 *
 * Constructs {@link ZTaskBuilder task builders} that can be used to create new tasks.
 */
export class ZTaskFactory {

  /**
   * Creates new task builder.
   *
   * @param target  Target package the new task is to be applied to.
   * @param name  New task name.
   *
   * @returns New task builder.
   */
  newTask(target: ZPackage, name: string): ZTaskBuilder {
    return new ZTaskBuilder$(target, name);
  }

}
