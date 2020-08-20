// eslint-disable-next-line @typescript-eslint/no-var-requires
const stripAnsi = require('strip-ansi');

// eslint-disable-next-line no-control-regex
const controlChars = /[\u0000-\u001f]+/g;

/**
 * @internal
 */
export function stripControlChars(text: string): string {
  return stripAnsi(text).replace(controlChars, '');
}
