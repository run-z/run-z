/**
 * @packageDocumentation
 * @module run-z
 */
import { SimpleZOptionsParser, simpleZOptionsParser } from './simple-options-parser';

/**
 * @internal
 */
const defaultZOptionsParser = (/*#__PURE__*/ simpleZOptionsParser());

/**
 * Parses command line options.
 *
 * @param args  Array of command line arguments
 * @param fromIndex  An index of command line argument to start processing from.
 *
 * @returns A promise resolved to a map of recognized option names to arrays of their values.
 */
export function parseZOptions(args: readonly string[], fromIndex?: number): Promise<SimpleZOptionsParser.Result> {
  return defaultZOptionsParser(args, fromIndex);
}
