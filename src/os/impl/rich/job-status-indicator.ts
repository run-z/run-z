import type { ZLogWriter } from '@run-z/log-z';
import cliSpinners from 'cli-spinners';
import logSymbols from 'log-symbols';

/**
 * @internal
 */
export const zJobSpinner = cliSpinners.dots;

/**
 * @internal
 */
export const zJobStatusIndicator = {
  progress(): string {
    const { interval, frames } = zJobSpinner;
    const now = Date.now();
    const period = interval * frames.length;
    const sinceStart = now % period;
    const stage = Math.floor(sinceStart / interval);

    return frames[stage];
  },

  ok(): string {
    return logSymbols.success;
  },

  error(): string {
    return logSymbols.error;
  },
};

/**
 * @internal
 */
export function zJobStatusIndicatorZLogField(writer: ZLogWriter): void {
  let status: keyof typeof zJobStatusIndicator = 'progress';
  const {
    details: { error, success },
  } = writer.message;

  if (error != null) {
    status = 'error';
  } else if (success) {
    status = 'ok';
  }

  writer.write(zJobStatusIndicator[status]());
}
