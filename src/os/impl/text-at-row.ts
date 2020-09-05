import ansiEscapes from 'ansi-escapes';

/**
 * @internal
 */
export function textAtRow(up: number, text: string): string {

  let out = '';

  if (up) {
    // Position at proper line
    out += ansiEscapes.cursorUp(up);
  }
  out += ansiEscapes.cursorLeft;

  // Update status line.
  // New line is here for other tools to properly catch the output.
  out += text + ansiEscapes.eraseEndLine + '\n';

  if (up > 1) {
    // Move back to original position.
    // Offset is one less, because new line is added above.
    out += ansiEscapes.cursorDown(up - 1);
  }

  return out;
}
