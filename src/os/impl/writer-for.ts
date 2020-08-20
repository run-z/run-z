import type { Writable } from 'stream';

/**
 * @internal
 */
export function writerFor(out: Writable): (data: string | Buffer) => Promise<void> {

  let ready: Promise<void> = Promise.resolve();

  return data => ready.then(
      () => new Promise<void>((resolve, reject) => {

        let ok = false;

        ok = out.write(
            data,
            err => {
              if (err != null) {
                reject(err);
              } else if (ok) {
                resolve();
              }
            },
        );

        if (ok) {
          resolve();
        } else {
          ready = new Promise<void>(makeReady => {
            out.once(
                'drain',
                () => {
                  ready = Promise.resolve();
                  makeReady();
                },
            );
          }).then(resolve);
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
