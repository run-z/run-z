import { textZLogFormatter, ZLogField, ZLogFormatter, ZLogLine } from '@run-z/log-z';
import ansiEscapes from 'ansi-escapes';
import cliTruncate from 'cli-truncate';
import type { ProgressZLogPrefix } from '../progress-log';
import { stripControlChars } from '../strip-control-chars';
import { textProgressZLogFormatter } from '../text';
import { ttyColumns } from '../tty-columns';
import { ZJobRow, zjobRowOf } from './job-rows';
import { zjobStatusIndicatorZLogField } from './job-status-indicator';

/**
 * @internal
 */
export function richProgressZLogFormatter(prefix: ProgressZLogPrefix): ZLogFormatter {

  const rich = textZLogFormatter({
    fields: [
      richStartZLogField,
      zjobStatusIndicatorZLogField,
      ' ',
      prefix.field(),
      ' ',
      zjobStatusZLogField(prefix),
      richEndZLogField,
    ],
  });
  const text = textProgressZLogFormatter(prefix);

  return message => {

    const row = message.details.row as ZJobRow | undefined;

    if (row == null) {
      return text(message);
    }

    const formatted = rich(message);

    row.done();

    return formatted;
  };
}

/**
 * @internal
 */
function richStartZLogField(line: ZLogLine): void {

  const up = zjobRowOf(line.message).up();
  let out = '';

  if (up > 0) {
    // Position at proper line
    out += ansiEscapes.cursorUp(up);
  }
  out += ansiEscapes.cursorLeft;

  line.write(out);
}

/**
 * @internal
 */
function richEndZLogField(line: ZLogLine): void {

  const row = zjobRowOf(line.message);
  const down = row.up() - 1;

  if (down > 0) {
    // Move back to original position.
    // Offset is one less, because new line is added above.
    line.write(ansiEscapes.eraseEndLine + '\n' + ansiEscapes.cursorDown(down));
  } else {
    line.write(ansiEscapes.eraseEndLine + '\n');
  }
}

/**
 * @internal
 */
function zjobStatusZLogField(prefix: ProgressZLogPrefix): ZLogField {
  return line => {

    const { text } = line.message;
    const prefixCols = prefix.targetCols + prefix.taskCols + 6;

    line.write(cliTruncate(
        stripControlChars(text) || 'Running...',
        ttyColumns() - prefixCols,
        {
          preferTruncationOnSpace: true,
        },
    ));
  };
}
