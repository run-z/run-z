import { AbortedZExecutionError, FailedZExecutionError } from '@run-z/exec-z';
import { messageZLogField, textZLogFormatter, ZLogFormatter, ZLogWriter } from '@run-z/log-z';
import type { ProgressZLogPrefix } from '../progress-log';

/**
 * @internal
 */
export function textProgressZLogFormatter(prefix: ProgressZLogPrefix): ZLogFormatter {
  return multilineZLogFormatter(
    prefix,
    textZLogFormatter({
      fields: [1, ' ', jobErrorZLogField, 0, messageZLogField()],
    }),
  );
}

/**
 * @internal
 */
export function jobErrorZLogField(writer: ZLogWriter): void {
  const error = writer.extractDetail('error');

  if (error instanceof AbortedZExecutionError || error instanceof FailedZExecutionError) {
    // No need to report aborted or failed execution
    writer.changeMessage({ ...writer.message, line: [error.message] });

    return;
  }
  if (error instanceof Error) {
    writer.writeError(error);
  }
  if (error !== undefined) {
    writer.write(String(error));
  }
}

/**
 * @internal
 */
export function multilineZLogFormatter(
  prefix: ProgressZLogPrefix,
  formatter: ZLogFormatter,
): ZLogFormatter {
  return message => {
    const pfx = prefix.text(message);
    const out = formatter(message)!;
    const lines = out.split('\n');

    if (!lines[lines.length - 1]) {
      // Remove the last empty line
      --lines.length;
    }

    return lines.map(line => `${pfx} ${line}\n`).join('');
  };
}
