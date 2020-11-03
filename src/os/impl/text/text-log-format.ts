import { AbortedZExecutionError, FailedZExecutionError } from '@run-z/exec-z';
import { messageZLogField, textZLogFormatter, ZLogFormatter, ZLogLine } from '@run-z/log-z';
import type { ProgressZLogPrefix } from '../progress-log';

/**
 * @internal
 */
export function textProgressZLogFormatter(prefix: ProgressZLogPrefix): ZLogFormatter {
  return multilineZLogFormatter(
      prefix,
      textZLogFormatter({
        fields: [
          messageZLogField(),
          ' ',
          jobErrorZLogField,
        ],
      }),
  );
}

/**
 * @internal
 */
export function jobErrorZLogField(line: ZLogLine): void {

  const error = line.message.error;

  if (error instanceof AbortedZExecutionError) {
    return; // No need to report aborted execution
  }
  if (error instanceof FailedZExecutionError) {
    return; // No need to report failed execution
  }
  if (error !== undefined) {
    line.writeError(error);
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
