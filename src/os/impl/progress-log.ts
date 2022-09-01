import { noop } from '@proc7ts/primitives';
import {
  logZWhenLevel,
  TextZLogFormat,
  ZLogField,
  ZLogFormatter,
  ZLogLevel,
  ZLogMessage,
  ZLogRecorder,
} from '@run-z/log-z';
import { logZToStream } from '@run-z/log-z/node';
import chalk from 'chalk';
import stringWidth from 'string-width';

/**
 * @internal
 */
export class ProgressZLogPrefix {

  targetCols = 0;
  taskCols = 0;

  update(target: string, task: string): boolean {
    const targetCols = stringWidth(target);
    const taskCols = stringWidth(task);
    let updated = false;

    if (this.targetCols < targetCols) {
      this.targetCols = targetCols;
      updated = true;
    }
    if (this.taskCols < taskCols) {
      this.taskCols = taskCols;
      updated = true;
    }

    return updated;
  }

  text(message: ZLogMessage): string {
    const {
      details: { target, task },
    } = message;
    const targetName = chalk.green(target);
    const gaps1 = ' '.repeat(Math.max(this.targetCols - stringWidth(targetName), 0));
    const taskName = chalk.greenBright(task);
    const gaps2 = ' '.repeat(Math.max(this.taskCols - stringWidth(taskName), 0));

    return `${chalk.gray('[')}${targetName}${gaps1} ${taskName}${gaps2}${chalk.gray(']')}`;
  }

  field(): ZLogField {
    return writer => writer.write(this.text(writer.message));
  }

}

/**
 * @internal
 */
export class ProgressZLogRecorder implements ZLogRecorder {

  static create({
    prefix,
    format,
    eol,
    onPrefixUpdate,
  }: {
    prefix: ProgressZLogPrefix;
    format: TextZLogFormat | ZLogFormatter;
    eol?: string | undefined;
    onPrefixUpdate?: ((this: void) => void) | undefined;
  }): ZLogRecorder {
    const by = logZWhenLevel(
      ZLogLevel.Error,
      logZToStream(process.stderr, { format, eol }),
      logZToStream(process.stdout, { format, eol }),
    );

    return new ProgressZLogRecorder(prefix, by, { onPrefixUpdate });
  }

  private readonly _onPrefixUpdate: () => void;

  constructor(
    private readonly _prefix: ProgressZLogPrefix,
    private readonly _by: ZLogRecorder,
    {
      onPrefixUpdate = noop,
    }: {
      onPrefixUpdate?: ((this: void) => void) | undefined;
    },
  ) {
    this._onPrefixUpdate = onPrefixUpdate;
  }

  record(message: ZLogMessage): void {
    const {
      details: { target, task },
    } = message;
    const prefixUpdated = this._prefix.update(target as string, task as string);

    this._by.record(message);
    if (prefixUpdated) {
      this._onPrefixUpdate();
    }
  }

  whenLogged(which?: 'all' | 'last'): Promise<boolean> {
    return this._by.whenLogged(which);
  }

  end(): Promise<void> {
    return this._by.end();
  }

}
