/* eslint-disable @typescript-eslint/no-var-requires */
import { mapIt } from '@proc7ts/a-iterable';
import type { ZJob } from '../../core';
import { ZJobOutput } from './job-output';
import type { ZProgressFormat } from './progress-format.cli';

/**
 * @internal
 */
const chalk = require('chalk');

/**
 * @internal
 */
const stringWidth = require('string-width');

/**
 * @internal
 */
export abstract class ZJobProgress {

  protected _row?: number;
  protected readonly _output = new ZJobOutput();
  protected _pending: Promise<void> = Promise.resolve();

  constructor(protected readonly _format: ZProgressFormat, readonly job: ZJob) {
  }

  start(): void {
    /* no-op */
  }

  stop(): void {
    /* no-op */
  }

  async render(): Promise<void> {
    /* no-op */
  }

  report(chunk: string | Buffer, fd: 0 | 1 = 0): void {
    this._output.add(chunk, fd);
    this._scheduleRender();
  }

  reportSuccess(): Promise<void> {
    this._scheduleRender();
    return this._pending;
  }

  reportError(error: any): Promise<void> {
    this.report(error.message || String(error), 1);
    return this._pending;
  }

  protected abstract _scheduleRender(): void;

  protected _printAll(): Promise<void> {
    this._pending = Promise.all(mapIt(
        this._output.lines(),
        ([line, fd]) => this._format.println(`${this._prefix()}${line}`, fd),
    )).then();
    if (this._row == null) {
      this._row = this._format.register(this);
    }
    return this._pending;
  }

  protected _prefix(): string {

    const task = this.job.call.task;
    const targetName = chalk.green(task.target.name);
    const gaps1 = ' '.repeat(Math.max(this._format.targetCols - stringWidth(targetName), 0));
    const taskName = chalk.greenBright(task.name);
    const gaps2 = ' '.repeat(Math.max(this._format.taskCols - stringWidth(taskName), 0));

    return `${chalk.gray('[')}${targetName}${gaps1} ${taskName}${gaps2}${chalk.gray(']')} `;
  }

}
