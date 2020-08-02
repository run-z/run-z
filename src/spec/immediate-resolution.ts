export async function immediateResolution(promise: Promise<any>): Promise<readonly [any?, any?]> {

  let resolved: [any?, any?] = [];

  promise.then(v => resolved = [v], e => resolved = [undefined, e]);
  await Promise.resolve();

  return resolved;
}
