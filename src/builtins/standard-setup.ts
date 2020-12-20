/**
 * @packageDocumentation
 * @module run-z/builtins
 */
import { arrayOfElements } from '@proc7ts/primitives';
import { ZConfig, ZExtension, ZSetup } from '../core';
import { ZAllBatchBuiltin } from './all-batch.builtin';
import { ZColorsBuiltin } from './colors.builtin';
import { ZCommandExecutionBuiltin } from './command-execution.builtin';
import { ZDepGraphBatchesBuiltin } from './dep-graph';
import { ZHelpBuiltin } from './help.builtin';
import { NamedZBatchesBuiltin } from './named-batches.builtin';
import { ZParallelBatchesBuiltin } from './parallel-batches';

const builtinZExtensions: readonly ZExtension[] = [
  NamedZBatchesBuiltin,
  ZAllBatchBuiltin,
  ZColorsBuiltin,
  ZCommandExecutionBuiltin,
  ZDepGraphBatchesBuiltin,
  ZHelpBuiltin,
  ZParallelBatchesBuiltin,
];

/**
 * Standard task execution setup.
 *
 * Enables {@link StandardZSetup.builtins built-in extensions}
 */
export class StandardZSetup extends ZSetup {

  /**
   * Built-in execution functionality extensions.
   */
  static get builtins(): readonly ZExtension[] {
    return builtinZExtensions;
  }

  /**
   * Constructs standard setup instance.
   *
   * @param config - Task execution configuration.
   */
  constructor(config: ZConfig = {}) {
    super({
      ...config,
      extensions: StandardZSetup.builtins.concat(arrayOfElements(config.extensions)),
    });
  }

}
