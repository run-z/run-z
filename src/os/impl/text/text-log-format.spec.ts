import { beforeEach, describe, expect, it } from '@jest/globals';
import { AbortedZExecutionError, FailedZExecutionError } from '@run-z/exec-z';
import { logZBy, zlogDetails, ZLogger } from '@run-z/log-z';
import { logZToStream } from '@run-z/log-z/node';
import { Writable } from 'stream';
import stripAnsi from 'strip-ansi';
import { ProgressZLogPrefix } from '../progress-log';
import { textProgressZLogFormatter } from './text-log-format';

describe('textProgressZLogFormatter', () => {

  let logger: ZLogger;
  let output: string[];

  beforeEach(() => {
    output = [];

    const prefix = new ProgressZLogPrefix();
    const writer = new Writable({
      write(chunk, _encoding, cb) {
        output.push(stripAnsi(chunk.toString()));
        cb();
      },
    });

    logger = logZBy(logZToStream(
        writer,
        {
          format: textProgressZLogFormatter(prefix),
          eol: '',
        },
    ));

  });

  it('prefixes each line', async () => {
    logger.info('1\n2\n3\n', zlogDetails({ target: 'package', task: 'build' }));
    await logger.whenLogged();
    expect(output[0].split('\n')).toEqual([
        '[package build] 1',
        '[package build] 2',
        '[package build] 3',
        '',
    ]);
  });
  it('does not log abort error stack trace', async () => {
    logger.error(new AbortedZExecutionError('Aborted!'), zlogDetails({ target: 'package', task: 'build' }));
    await logger.whenLogged();
    expect(output).toEqual(['[package build] Aborted!\n']);
  });
  it('does not log failure error stack trace', async () => {
    logger.error(new FailedZExecutionError('Failed!'), zlogDetails({ target: 'package', task: 'build' }));
    await logger.whenLogged();
    expect(output).toEqual(['[package build] Failed!\n']);
  });
  it('logs any other error stack trace', async () => {
    logger.error(new Error('Error!'), zlogDetails({ target: 'package', task: 'build' }));
    await logger.whenLogged();
    expect(output[0]).toContain('Error: Error!');
    expect(output[0].split('\n').length).toBeGreaterThan(2);
  });
});
