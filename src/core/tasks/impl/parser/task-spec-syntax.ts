import { ZOptionInput, ZOptionSyntax } from '@run-z/optionz';
import { ZSetup } from '../../../setup.js';

/**
 * @internal
 */
export function zTaskSpecSyntax(setup: ZSetup): readonly ZOptionSyntax[] {
  return [
    ZOptionSyntax.longOptions,
    ZOptionSyntax.shortOptions,
    zPackageSelectorSyntax.bind(undefined, setup),
    zTaskAttrSyntax.bind(undefined, setup),
    zTaskPreArgsSyntax,
    parallelZTasksSyntax,
    zTaskPreSyntax,
    zTaskShorthandPreArgSyntax,
    ZOptionSyntax.any,
  ];
}

/**
 * @internal
 */
function zPackageSelectorSyntax(
  { taskParser }: ZSetup,
  args: readonly [string, ...string[]],
): readonly ZOptionInput[] {
  const [name] = args;

  if (!taskParser.parseTarget(name)) {
    return [];
  }

  const tail = args.slice(1);

  return [
    { name, tail },
    { key: './*', name, tail },
  ];
}

/**
 * @internal
 */
function zTaskAttrSyntax(
  { taskParser }: ZSetup,
  args: readonly [string, ...string[]],
): readonly ZOptionInput[] {
  const [first] = args;
  const attr = taskParser.parseAttr(first);

  if (!attr) {
    return [];
  }

  const [attrName, attrValue, attrReplacement] = attr;
  const key = `${attrName}=${attrValue}`;
  const name = attrReplacement ? `${attrName}:=${attrValue}` : key;
  const tail = args.slice(1);

  return [
    {
      key,
      name,
      tail,
    },
    {
      key: `${attrName}=*`,
      name,
      tail,
    },
    {
      key: `*=*`,
      name,
      tail,
    },
  ];
}

/**
 * @internal
 */
function zTaskPreArgsSyntax(args: readonly [string, ...string[]]): readonly ZOptionInput[] {
  const [first] = args;
  const openingIdx = first.indexOf('//');

  if (openingIdx < 0) {
    return [];
  }
  if (openingIdx) {
    // Opening delimiter is not at the first position
    // Split and retry
    return [
      {
        name: first.substr(0, openingIdx).trim(),
        tail: [first.substr(openingIdx), ...args.slice(1)],
        retry: true,
      },
    ];
  }

  let contentIdx = openingIdx + 2;

  while (first[contentIdx] === '/') {
    ++contentIdx;
  }

  const delimiter = first.substring(openingIdx, contentIdx);
  const closingIdx = first.indexOf(delimiter, contentIdx);

  if (closingIdx > 0) {
    // First arg contains both opening and closing delimiter

    const values = [first.substring(contentIdx, closingIdx), '//'];
    const afterPreArgsIdx = closingIdx + delimiter.length;
    const restArgs = args.slice(1);
    const suffix = first.substr(afterPreArgsIdx).trim();
    const tail = suffix ? [suffix, ...restArgs] : restArgs;

    return [
      {
        key: '//*',
        name: delimiter,
        values,
        tail,
      },
    ];
  }

  // Search for closing delimiter
  for (let i = 1; i < args.length; ++i) {
    const arg = args[i];
    const closingIdx = arg.indexOf(delimiter);

    if (closingIdx >= 0) {
      // Closing delimiter found

      const restValues = args.slice(1, i);
      const lastValues = closingIdx ? [arg.substr(0, closingIdx)] : [];
      const values =
        contentIdx < first.length
          ? [first.substr(contentIdx), ...restValues, ...lastValues, '//']
          : [...restValues, ...lastValues, '//'];
      const afterPreArgsIdx = closingIdx + delimiter.length;
      const restArgs = args.slice(i + 1);
      const tail =
        afterPreArgsIdx < arg.length ? [arg.substr(afterPreArgsIdx), ...restArgs] : [...restArgs];

      return [
        {
          key: '//*',
          name: delimiter,
          values,
          tail,
        },
      ];
    }
  }

  // No closing delimiter.
  // Treat the rest of args as prerequisite ones.
  return [
    {
      key: '//*',
      name: delimiter,
      values: [first.substr(contentIdx), ...args.slice(1), '//'],
    },
  ];
}

/**
 * @internal
 */
const parallelZTaskSep = /(,)/;

/**
 * @internal
 */
function parallelZTasksSyntax(args: readonly [string, ...string[]]): readonly ZOptionInput[] {
  const [entry] = args;
  const [name, ...values] = entry.split(parallelZTaskSep).filter(name => !!name);

  return values.length ? [{ name, values, tail: args.slice(1), retry: true }] : [];
}

/**
 * @internal
 */
function zTaskPreSyntax(args: readonly [string, ...string[]]): readonly ZOptionInput[] {
  const [entry] = args;
  const [name, ...preArgs] = entry.split('/');

  if (!name || !preArgs.length) {
    return [];
  }

  return [
    {
      name,
      values: preArgs.filter(preArg => !!preArg).map(preArg => '/' + preArg),
      tail: args.slice(1),
      retry: true,
    },
  ];
}

/**
 * @internal
 */
function zTaskShorthandPreArgSyntax(args: readonly [string, ...string[]]): readonly ZOptionInput[] {
  const [name] = args;

  if (!name.startsWith('/') || name.startsWith('//')) {
    return [];
  }

  const tail = args.slice(1);

  return [
    {
      name,
      tail,
    },
    {
      key: '/*',
      name,
      tail,
    },
  ];
}
