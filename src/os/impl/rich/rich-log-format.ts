import { textZLogFormatter, ZLogField, ZLogFormatter, ZLogWriter } from '@run-z/log-z';
import ansiEscapes from 'ansi-escapes';
import cliTruncate from 'cli-truncate';
import type { ProgressZLogPrefix } from '../progress-log.js';
import { stripControlChars } from '../strip-control-chars.js';
import { textProgressZLogFormatter } from '../text/text-log-format.js';
import { ttyColumns } from '../tty-columns.js';
import { ZJobRow, zJobRowOf } from './job-rows.js';
import { zJobStatusIndicatorZLogField } from './job-status-indicator.js';

/**
 * @internal
 */
export function richProgressZLogFormatter(prefix: ProgressZLogPrefix): ZLogFormatter {
  const rich = textZLogFormatter({
    fields: [
      richStartZLogField,
      zJobStatusIndicatorZLogField,
      ' ',
      prefix.field(),
      ' ',
      zJobStatusZLogField(prefix),
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
  const up = zJobRowOf(writer.message).up();
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
  const row = zJobRowOf(writer.message);
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
function zJobStatusZLogField(prefix: ProgressZLogPrefix): ZLogField {
  return writer => {
    const { line } = writer.message;
    const prefixCols = prefix.targetCols + prefix.taskCols + 6;

    writer.write(
      cliTruncate(stripControlChars(line.join(' ')) || 'Running...', ttyColumns() - prefixCols, {
        preferTruncationOnSpace: true,
      }),
    );
  };
}
