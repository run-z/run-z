/**
 * @packageDocumentation
 * @module run-z
 */

export interface ZOptionInput {

  readonly key?: string;

  readonly name: string;

  readonly values?: readonly string[];

  readonly tail?: readonly string[];

}

export const ZOptionInput = {

  isOptionName(this: void, arg: string): boolean {
    return arg.startsWith('-') && arg !== '-' && arg !== '--';
  },

  valuesOf(this: void, args: readonly string[], fromIndex = 0): readonly string[] {

    let i = fromIndex;

    while (i < args.length) {

      const arg = args[i];

      if (ZOptionInput.isOptionName(arg)) {
        break;
      }

      ++i;
    }

    return args.slice(fromIndex, i);
  },

  equal(this: void, first: ZOptionInput, second: ZOptionInput): boolean {

    const { name: name1, key: key1 = name1, values: values1 = [], tail: tail1 = [] } = first;
    const { name: name2, key: key2 = name2, values: values2 = [], tail: tail2 = [] } = second;

    return name1 === name2
        && key1 === key2
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
