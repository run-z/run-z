import { beforeEach, describe, expect, it } from '@jest/globals';
import type { ZLogger } from '@run-z/log-z';
import { levelZLogField, logZBy, messageZLogField, zlogDetails, zlogError, ZLogLine } from '@run-z/log-z';
import { logZToStream } from '@run-z/log-z/node';
import { Writable } from 'stream';
import { ZJobOutput } from './job-output';
import { ZJobRow, ZJobRows } from './job-rows';
import { RichJobZLogRecorder } from './rich-job.log';

describe('RichJobZLogRecorder', () => {

  let logger: ZLogger;
  let output: ZJobOutput;
  let lines: string[];

  beforeEach(() => {
    output = new ZJobOutput();
    lines = [];

    const writer = new Writable({
      write(chunk, _encoding, cb) {
        lines.push(chunk.toString());
        cb();
      },
    });

    logger = logZBy(new RichJobZLogRecorder(
        new ZJobRows(),
        output,
        logZToStream(
            writer,
            {
              format: {
                fields: [
                  levelZLogField(),
                  ' ',
                  messageZLogField(),
                  ' ',
                  (line: ZLogLine): void => {

                    const row: ZJobRow | undefined = line.message.details.row;

                    if (row) {
                      line.write(`row: ${row.up()}`);
                      row.done();
                    }
                  },
                ],
              },
              eol: '',
            },
        ),
    ));
  });

  it('collects output', async () => {
    logger.info('Message 1\n');
    logger.error('Message 2\n');
    await logger.whenLogged();
    await logger.end();

    expect(lines).toEqual([
      '[INFO ] Message 1 row: 0',
      '[INFO ] Message 2 row: 1',
    ]);
    expect(output.lines()).toEqual([
      ['Message 1', 0],
      ['Message 2', 1],
    ]);
  });
  it('reports success with last status', async () => {
    logger.info('Message 1\n');
    logger.info('Success\n', zlogDetails({ success: 1 }));
    await logger.whenLogged();
    await logger.end();

    expect(lines).toEqual([
      '[INFO ] Message 1 row: 0',
      '[INFO ] Message 1 row: 1',
    ]);
    expect(output.lines()).toEqual([
      ['Message 1', 0],
    ]);
  });
  it('reports success without last status', async () => {
    logger.info('Success\n', zlogDetails({ success: 1 }));
    await logger.whenLogged();
    await logger.end();

    expect(lines).toEqual([
      '[INFO ] Ok row: 0',
    ]);
    expect(output.lines()).toHaveLength(0);
  });
  it('reports error and prints full output', async () => {
    logger.info('Message 1\n');
    logger.error(zlogError(new Error('Error!')));
    await logger.whenLogged();
    await logger.end();

    expect(lines).toEqual([
      '[INFO ] Message 1 row: 0',
      '[INFO ] Error: Error! row: 1',
      '[INFO ] Message 1',
      '[ERROR] Error!',
    ]);
    expect(output.lines()).toEqual([
      ['Message 1', 0],
    ]);
  });

});
