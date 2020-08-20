import { asis } from '@proc7ts/primitives';
import { EventEmitter } from 'events';
import type { Writable } from 'stream';
import { writerFor } from './writer-for';

describe('writerFor', () => {

  let out: Writable;
  let emitter: EventEmitter;
  let write: jest.Mock;
  let writer: (chunk: string | Buffer) => Promise<void>;

  beforeEach(() => {
    emitter = new EventEmitter();
    write = jest.fn();
    out = {
      once(event: string, listener: (...args: any[]) => void) {
        emitter.once(event, listener);
        return this;
      },
      write,
    } as any;
    writer = writerFor(out);
  });

  it('writes to output', async () => {
    write.mockImplementation((_chunk, cb: (err?: any) => void) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      cb();
      return true;
    });

    await writer('test');

    expect(write).toHaveBeenCalledWith('test', expect.any(Function));
  });
  it('reports output error', async () => {

    const error = new Error('test');

    write.mockImplementation((_chunk, cb: (err?: any) => void) => {
      cb(error);
      return true;
    });

    expect(await writer('test').catch(asis)).toBe(error);
  });
  it('awaits for drain', async () => {

    let toDrain = true;

    write.mockImplementation((_chunk, cb: (err?: any) => void) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      cb();
      if (toDrain) {
        toDrain = false;
        return false;
      }
      return true;
    });

    await writer('test');

    const promise = writer('after drain');
    await Promise.resolve(); // Await for write

    emitter.emit('drain');
    await promise;

    expect(write).toHaveBeenCalledWith('after drain', expect.any(Function));
  });
});
