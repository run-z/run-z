/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskParser } from './tasks';

/**
 * Task execution functionality extension.
 */
export interface ZExtension {

  /**
   * Addition options supported by this extension.
   */
  readonly options?: ZTaskParser.SupportedOptions;

}
