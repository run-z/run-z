/**
 * @packageDocumentation
 * @module run-z
 */
import { filterIt, flatMapIt } from '@proc7ts/a-iterable';
import { isArrayOfElements } from '@proc7ts/primitives';
import { ZOptionInput } from './option-input';

export type ZOptionSyntax = (this: void, args: readonly [string, ...string[]]) => Iterable<ZOptionInput>;

/**
 * @internal
 */
const defaultZOptionSyntax = zOptionSyntaxBy([
  longZOptionSyntax,
  shortZOptionSyntax,
  anyZOptionSyntax,
]);

export const ZOptionSyntax = {

  get default(): ZOptionSyntax {
    return defaultZOptionSyntax;
  },

  get longOptions(): ZOptionSyntax {
    return longZOptionSyntax;
  },

  get shortOptions(): ZOptionSyntax {
    return shortZOptionSyntax;
  },

  get any(): ZOptionSyntax {
    return anyZOptionSyntax;
  },

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

