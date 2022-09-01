import type { ZLogWriter } from '@run-z/log-z';
import cliSpinners from 'cli-spinners';
import logSymbols from 'log-symbols';

/**
 * @internal
 */
export const zjobSpinner = cliSpinners.dots;

/**
 * @internal
 */
export const zjobStatusIndicator = {
  progress(): string {
    const { interval, frames } = zjobSpinner;
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
export function zjobStatusIndicatorZLogField(writer: ZLogWriter): void {
  let status: keyof typeof zjobStatusIndicator = 'progress';
  const {
    details: { error, success },
  } = writer.message;

  if (error != null) {
    status = 'error';
  } else if (success) {
    status = 'ok';
  }

  writer.write(zjobStatusIndicator[status]());
}
