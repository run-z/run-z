/**
 * @packageDocumentation
 * @module run-z/builtins
 */
import { chalkZColorOptions } from '@run-z/optionz/colors';
import type { ZExtension } from '../core';

/**
 * Builtin extension to control terminal color support.
 *
 * Supports `--color`, `--no-color`, and `--no-colors` options.
 */
export const ZColorsBuiltin: ZExtension = {
  shellOptions: chalkZColorOptions(),
};
