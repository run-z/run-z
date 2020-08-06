/**
 * @packageDocumentation
 * @module run-z
 */
import { arrayOfElements } from '@proc7ts/primitives';
import { ZConfig, ZExtension, ZSetup } from '../core';

const builtinZExtensions: readonly ZExtension[] = [

];

/**
 * Standard task execution setup.
 *
 * Enables {@link builtinZExtensions built-in extensions}
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
   * @param config  Task execution configuration.
   */
  constructor(config: ZConfig = {}) {
    super({
      ...config,
      extensions: StandardZSetup.builtins.concat(arrayOfElements(config.extensions)),
    });
  }

}
