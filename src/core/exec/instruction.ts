/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZInstructionRecorder } from './instruction-recorder';

export type ZInstruction = (this: void, recorder: ZInstructionRecorder) => void | PromiseLike<unknown>;
