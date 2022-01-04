import { beforeEach, describe, expect, it } from '@jest/globals';
import { noop } from '@proc7ts/primitives';
import type { ZLogger } from '@run-z/log-z';
import { logZBy, zlogDetails, ZLogLevel, zlogMessage } from '@run-z/log-z';
import { logZToStream } from '@run-z/log-z/node';
import ansiEscapes from 'ansi-escapes';
import { Writable } from 'node:stream';
import { ProgressZLogPrefix, ProgressZLogRecorder } from './progress-log';
import { ZJobRows } from './rich/job-rows';
import { richProgressZLogFormatter } from './rich/rich-log-format';

describe('ProgressZLogRecorder', () => {

  let prefix: ProgressZLogPrefix;
  let rows: ZJobRows;
  let logger: ZLogger;
  let lines: string[];

  beforeEach(() => {
    prefix = new ProgressZLogPrefix();
    rows = new ZJobRows();
    lines = [];

    const writer = new Writable({
      write(chunk: Buffer | string, _encoding, cb) {
        lines.push(chunk.toString());
        cb();
      },
    });

    logger = logZBy(new ProgressZLogRecorder(
        prefix,
        logZToStream(
            writer,
            {
              format: richProgressZLogFormatter(prefix),
              eol: '',
            },
        ),
        {},
    ));
  });

  it('positions at proper row', async () => {

    const row1 = rows.add(noop);
    const row2 = rows.add(noop);

    logger.info('Message 1', zlogDetails({ row: row1, target: 'package', task: 'task1' }));
    logger.info('Message 2', zlogDetails({ row: row2, target: 'package', task: 'task2' }));
    logger.info('Message 3', zlogDetails({ row: row1, target: 'package', task: 'task1' }));

    await logger.whenLogged();

    expect(lines).toEqual([
      expect.stringContaining(
          prefix.text(zlogMessage(ZLogLevel.Info, zlogDetails({ target: 'package', task: 'task1' })))
          + ' Message 1' + ansiEscapes.eraseEndLine + '\n',
      ),
      expect.stringContaining(
          prefix.text(zlogMessage(ZLogLevel.Info, zlogDetails({ target: 'package', task: 'task2' })))
          + ' Message 2' + ansiEscapes.eraseEndLine + '\n',
      ),
      expect.stringContaining(
          prefix.text(zlogMessage(ZLogLevel.Info, zlogDetails({ target: 'package', task: 'task1' })))
          + ' Message 3' + ansiEscapes.eraseEndLine + '\n' + ansiEscapes.cursorDown(1),
      ),
    ]);

    expect(lines).toEqual([
      expect.stringContaining(ansiEscapes.cursorLeft),
      expect.stringContaining(ansiEscapes.cursorLeft),
      expect.stringContaining(ansiEscapes.cursorUp(2) + ansiEscapes.cursorLeft),
    ]);
  });
  it('prints verbatim without row specified', async () => {
    logger.info('Message 1', zlogDetails({ target: 'package', task: 'task1' }));
    logger.info('Message 2', zlogDetails({ target: 'package', task: 'task2' }));
    logger.info('Message 3', zlogDetails({ target: 'package', task: 'task1' }));

    await logger.whenLogged();
    expect(lines).toEqual([
      prefix.text(zlogMessage(ZLogLevel.Info, zlogDetails({ target: 'package', task: 'task1' })))
      + ' Message 1\n',
      prefix.text(zlogMessage(ZLogLevel.Info, zlogDetails({ target: 'package', task: 'task2' })))
      + ' Message 2\n',
      prefix.text(zlogMessage(ZLogLevel.Info, zlogDetails({ target: 'package', task: 'task1' })))
      + ' Message 3\n',
    ]);
  });

  describe('end', () => {
    it('stops logging', async () => {
      await logger.end();

      logger.info('Message', zlogDetails({ target: 'package', task: 'build' }));
      expect(await logger.whenLogged()).toBe(false);
      expect(lines).toHaveLength(0);
    });
  });

});
