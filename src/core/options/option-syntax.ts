/**
 * @packageDocumentation
 * @module run-z
 */
import { filterIt, flatMapIt } from '@proc7ts/a-iterable';
import { isArrayOfElements } from '@proc7ts/primitives';
import { ZOptionInput } from './option-input';

/**
 * Supported command line syntax.
 *
 * The syntax is a function that converts raw command line arguments to {@link ZOptionInput option input} suitable
 * to be recognized by {@link ZOptionReader option readers}.
 *
 * A syntax should be {@link ZOptionsConfig.syntax registered} for options parser to respect it.
 */
export type ZOptionSyntax =
/**
 * @param args  An array of command line arguments to process.
 *
 * @returns An iterable of option inputs. May be empty if the command line argument has another syntax.
 */
    (this: void, args: readonly [string, ...string[]]) => Iterable<ZOptionInput>;

/**
 * @internal
 */
const defaultZOptionSyntax = zOptionSyntaxBy([
  longZOptionSyntax,
  shortZOptionSyntax,
  anyZOptionSyntax,
]);

export const ZOptionSyntax = {

  /**
   * Default command line option syntax.
   *
   * Includes support for:
   *
   * - {@link longOptions long options syntax},
   * - {@link shortOptions short options syntax}, and
   * - {@link any any options syntax} as a fallback.
   */
  get default(): ZOptionSyntax {
    return defaultZOptionSyntax;
  },

  /**
   * Long command line option syntax.
   *
   * Supports the following option formats:
   *
   * - `--name=value`
   * - `--name [value1 [value2 ...]]`
   *
   * Option keys should be in `--name` format. Uses `--*` as a fallback option key.
   *
   * Enabled {@link default by default}.
   */
  get longOptions(): ZOptionSyntax {
    return longZOptionSyntax;
  },

  /**
   * Short command line option syntax.
   *
   * Supports the following option formats:
   *
   * - `-name [value1 [value2 ...]]`. Corresponding option key should be in `-name` format.
   * - `-n[m[o...]][VALUE]`. Corresponding option key should be in `-n*` format.
   *
   * Uses `-*` as a fallback option key.
   *
   * Enabled {@link default by default}.
   */
  get shortOptions(): ZOptionSyntax {
    return shortZOptionSyntax;
  },

  /**
   * Any command line option syntax.
   *
   * Supports `name [value1 [value2 ...]]` format. Uses `*` as a fallback option key.
   *
   * This is used as a fallback {@link default by default}.
   */
  get any(): ZOptionSyntax {
    return anyZOptionSyntax;
  },

  /**
   * Builds an option syntax supporting other syntaxes.
   *
   * @param syntax  Either a single syntax, or an array of syntaxes to support.
   *
   * @returns Either a single `syntax` passed in, or a syntax supporting all of them.
   */
  by(this: void, syntax: ZOptionSyntax | readonly ZOptionSyntax[]): ZOptionSyntax {
    return zOptionSyntaxBy(syntax);
  },

};

/**
 * @internal
 */
function zOptionSyntaxBy(syntax: ZOptionSyntax | readonly ZOptionSyntax[]): ZOptionSyntax {
  if (!isArrayOfElements(syntax)) {
    return syntax;
  }

  return args => {

    const tried: ZOptionInput[] = [];

    return filterIt(
        flatMapIt(
            syntax,
            p => p(args),
        ),
        input => {
          // Prevent input duplicates
          if (tried.some(t => ZOptionInput.equal(t, input))) {
            return false;
          }

          tried.push(input);

          return true;
        },
    );
  };
}

/**
 * @internal
 */
function longZOptionSyntax(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

  let [name] = args;

  if (!name.startsWith('--')) {
    return [];
  }

  const eqIdx = name.indexOf('=', 2);

  if (eqIdx > 0) {
    // `--name=value` form

    const values = [name.substr(eqIdx + 1)];
    const tail = args.slice(1);

    name = name.substr(0, eqIdx);

    return [
      { name, values, tail },
      { key: '--*', name, values, tail },
    ];
  }

  // `--name value value...` form
  const values = ZOptionInput.valuesOf(args, 1);
  const tail = args.slice(values.length + 1);

  return [
    { name, values, tail },
    { key: '--*', name, values, tail },
  ];
}

/**
 * @internal
 */
function shortZOptionSyntax(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

  const [name] = args;

  if (name.length < 2 || !name.startsWith('-') || name.startsWith('--')) {
    return [];
  }

  const rest = args.slice(1);
  const values = ZOptionInput.valuesOf(rest);
  const tail = args.slice(values.length + 1);
  const result: ZOptionInput[] = [{ name, values, tail }];
  const letters = name.substr(2);

  if (letters) {

    const shortName = name.substr(0, 2);

    result.push(
        { key: shortName + '*', name: shortName, values: [letters], tail: rest },
        { name: shortName, tail: ['-' + letters, ...rest] },
    );
  }

  result.push({ key: '-*', name, values, tail });

  return result;
}

/**
 * @internal
 */
function anyZOptionSyntax(args: readonly [string, ...string[]]): Iterable<ZOptionInput> {

  const [name] = args;
  const values = ZOptionInput.valuesOf(args, 1);
  const tail = args.slice(values.length + 1);

  return [
    { name, values, tail },
    { key: '*', name, values, tail },
  ];
}

