/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZInstructionRecorder } from './instruction-recorder';

export interface ZInstruction {

  instruct(recorder: ZInstructionRecorder): void | PromiseLike<unknown>;

}
