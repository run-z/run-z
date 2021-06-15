import { textZLogFormatter, ZLogField, ZLogFormatter, ZLogWriter } from '@run-z/log-z';
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
function richStartZLogField(writer: ZLogWriter): void {

  const up = zjobRowOf(writer.message).up();
  let out = '';

  if (up > 0) {
    // Position at proper line
    out += ansiEscapes.cursorUp(up);
  }
  out += ansiEscapes.cursorLeft;

  writer.write(out);
}

/**
 * @internal
 */
function richEndZLogField(writer: ZLogWriter): void {

  const row = zjobRowOf(writer.message);
  const down = row.up() - 1;

  if (down > 0) {
    // Move back to original position.
    // Offset is one less, because new line is added above.
    writer.write(ansiEscapes.eraseEndLine + '\n' + ansiEscapes.cursorDown(down));
  } else {
    writer.write(ansiEscapes.eraseEndLine + '\n');
  }
}

/**
 * @internal
 */
function zjobStatusZLogField(prefix: ProgressZLogPrefix): ZLogField {
  return writer => {

    const { line } = writer.message;
    const prefixCols = prefix.targetCols + prefix.taskCols + 6;

    writer.write(cliTruncate(
        stripControlChars(line.join(' ')) || 'Running...',
        ttyColumns() - prefixCols,
        {
          preferTruncationOnSpace: true,
        },
    ));
  };
}
