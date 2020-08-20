import type { Writable } from 'stream';

/**
 * @internal
 */
export function writerFor(out: Writable): (data: string | Buffer) => Promise<void> {

  let ready: Promise<void> = Promise.resolve();

  return data => ready.then(
      () => new Promise<void>((resolve, reject) => {

        const ok = out.write(
            data,
            err => {
              if (err != null) {
                reject(err);
              } else {
                resolve();
              }
            },
        );

        if (!ok) {
          ready = new Promise<void>(makeReady => {
            out.once(
                'drain',
                () => {
                  ready = Promise.resolve();
                  makeReady();
                },
            );
          });
        }
      }),
  );
}

/**
 * @internal
 */
export const write2stdout = (/*#__PURE__*/ writerFor(process.stdout));

/**
 * @internal
 */
export const write2stderr = (/*#__PURE__*/ writerFor(process.stderr));
