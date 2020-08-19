// eslint-disable-next-line @typescript-eslint/no-var-requires
const stripAnsi = require('strip-ansi');

/**
 * @internal
 */
export function stripControlChars(text: string): string {
  text = stripAnsi(text);

  let out = '';

  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < text.length; ++i) {

    const c = text[i];

    if (c >= ' ') {
      out += c;
    }
  }

  return out;
}
