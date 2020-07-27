/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * Command line option input.
 *
 * This is constructed from raw command line arguments by {@link ZOptionSyntax options syntax}.
 */
export interface ZOptionInput {

  /**
   * A key of {@link ZOptionReader option readers} to recognize te option.
   *
   * @default [name]
   */
  readonly key?: string;

  /**
   * Option name.
   *
   * I.e. a command line argument to process.
   */
  readonly name: string;

  /**
   * Array of option values.
   *
   * I.e. command line arguments immediately following the option [name].
   *
   * @default Empty array.
   */
  readonly values?: readonly string[];

  /**
   * Array of command line arguments following the option [name] and its [values].
   */
  readonly tail?: readonly string[];

  /**
   * Whether to retry the option processing.
   *
   * When an input with this flag set is encountered, current option processing terminates and restarts for another one.
   */
  readonly retry?: boolean;

}

export const ZOptionInput = {

  /**
   * Checks whether the given command line argument is suitable to be used as option value.
   *
   * This is used by default to find option values.
   *
   * @param arg  Command line argument to check.
   *
   * @returns `true` unless argument starts with `-` and not equal to `-` itself.
   */
  isOptionValue(this: void, arg: string): boolean {
    return !arg.startsWith('-') || arg === '-';
  },

  /**
   * Extracts command line option values.
   *
   * This is used by default to extract option values.
   *
   * @param args  Command line arguments.
   * @param fromIndex  First argument index to start extracting values at.
   *
   * @returns An array of command line {@link isOptionValue option values}.
   */
  valuesOf(this: void, args: readonly string[], fromIndex = 0): readonly string[] {

    let i = fromIndex;

    while (i < args.length) {

      const arg = args[i];

      if (!ZOptionInput.isOptionValue(arg)) {
        break;
      }

      ++i;
    }

    return args.slice(fromIndex, i);
  },

  /**
   * Checks whether two option inputs are equal to each other.
   * @param first
   * @param second
   */
  equal(this: void, first: ZOptionInput, second: ZOptionInput): boolean {

    const { name: name1, key: key1 = name1, values: values1 = [], tail: tail1 = [], retry: retry1 = false } = first;
    const { name: name2, key: key2 = name2, values: values2 = [], tail: tail2 = [], retry: retry2 = false } = second;

    return name1 === name2
        && key1 === key2
        && retry1 === retry2
        && arraysEqual(values1, values2)
        && arraysEqual(tail1, tail2);
  },

};

/**
 * @internal
 */
function arraysEqual<T>(first: readonly T[], second: readonly T[]): boolean {
  return first.length === second.length && first.every((v, i) => v === second[i]);
}
