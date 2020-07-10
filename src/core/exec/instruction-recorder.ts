/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackageResolver } from '../packages';
import type { ZTask, ZTaskDetails } from '../tasks';
import type { ZInstruction } from './instruction';

export interface ZInstructionRecorder {

  readonly resolver: ZPackageResolver;

  depth(): number;

  follow(instruction: ZInstruction): Promise<void>;

  fulfil(
      task: ZTask,
      details?: (this: void) => Partial<ZTaskDetails>,
  ): Promise<(this: void) => ZTaskDetails>;

}
