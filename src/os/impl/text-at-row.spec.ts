import ansiEscapes from 'ansi-escapes';
import { textAtRow } from './text-at-row';

describe('textAtRow', () => {
  it('does not reposition text without offset', () => {
    expect(textAtRow(0, 'TEXT')).toEqual(ansiEscapes.cursorLeft + 'TEXT' + ansiEscapes.eraseEndLine + '\n');
  });
  it('repositions one row up', () => {
    expect(textAtRow(1, 'TEXT')).toEqual(
        ansiEscapes.cursorUp(1) + ansiEscapes.cursorLeft
        + 'TEXT' + ansiEscapes.eraseEndLine + '\n',
    );
  });
  it('repositions two rows up and moves back', () => {
    expect(textAtRow(2, 'TEXT')).toEqual(
        ansiEscapes.cursorUp(2) + ansiEscapes.cursorLeft
        + 'TEXT' + ansiEscapes.eraseEndLine + '\n'
        + ansiEscapes.cursorDown(1),
    );
  });
});
