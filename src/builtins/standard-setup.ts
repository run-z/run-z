import { asArray } from '@proc7ts/primitives';
import { ZConfig } from '../core/config.js';
import { ZExtension } from '../core/extension.js';
import { ZSetup } from '../core/setup.js';
import { ZAllBatchBuiltin } from './all-batch.builtin.js';
import { ZColorsBuiltin } from './colors.builtin.js';
import { ZCommandExecutionBuiltin } from './command-execution.builtin.js';
import { ZDepGraphBatchesBuiltin } from './dep-graph/dep-graph-batches.builtin.js';
import { ZHelpBuiltin } from './help.builtin.js';
import { NamedZBatchesBuiltin } from './named-batches.builtin.js';
import { ZParallelBatchesBuiltin } from './parallel-batches/parallel-batches.builtin.js';

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
      extensions: StandardZSetup.builtins.concat(asArray(config.extensions)),
    });
  }

}
