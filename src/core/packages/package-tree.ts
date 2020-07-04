/**
 * @packageDocumentation
 * @module run-z
 */
import { valueProvider } from '@proc7ts/primitives';
import type { ZPackageLocation } from './package-location';
import type { ZPackageJson } from './package.json';

/**
 * Virtual package tree.
 *
 * This is a package location implementation that can be filled with package and sub-package data.
 */
export class ZPackageTree implements ZPackageLocation {

  readonly parent: ZPackageTree | undefined;
  readonly path: string;
  readonly load: () => Promise<ZPackageJson>;
  private readonly _nested = new Map<string, ZPackageTree>();

  /**
   * Constructs package tree.
   *
   * @param baseName  Base name of the package path.
   * @param packageJson  Either `package.json` contents, a promise resolving to it, or nothing.
   * @param parent  Parent package tree or `undefined` if there is no parent location.
   */
  constructor(
      readonly baseName: string,
      packageJson?: PromiseLike<ZPackageJson | undefined> | ZPackageJson,
      parent?: ZPackageTree,
  ) {
    this.parent = parent;
    this.path = parent ? `${parent.path}/${baseName}` : baseName;

    const load = Promise.resolve(packageJson).then((json = {}) => json);

    this.load = valueProvider(load);
  }

  relative(path: string): ZPackageTree | undefined {

    const [name, restPath] = pathNameAndRest(path);
    let nested: ZPackageTree | undefined;

    if (name === '.') {
      nested = this;
    } else {
      if (name === '..') {
        nested = this.parent;
      } else {
        nested = this._nested.get(name);
      }
      if (!nested) {
        return;
      }
    }

    return restPath ? nested.relative(restPath) : nested;
  }

  *nested(): Iterable<ZPackageTree> {
    yield* this._nested.values();
  }

  *deeplyNested(): Iterable<ZPackageTree> {
    for (const nested of this._nested.values()) {
      yield nested;
      yield* nested.deeplyNested();
    }
  }

  /**
   * Puts nested package tree.
   *
   * Replaces a previous package tree with the same name.
   *
   * @param path  Nested slash-separated package path.
   * @param packageJson  Either new `package.json` contents, a promise resolving to it, or nothing.
   *
   * @returns New nested package tree.
   */
  put(path: string, packageJson?: PromiseLike<ZPackageJson | undefined> | ZPackageJson): ZPackageTree {

    const [name, restPath] = pathNameAndRest(path);

    if (!restPath) {

      const nested = new ZPackageTree(name, packageJson, this);

      this._nested.set(name, nested);

      return nested;
    }

    const nested = this._nested.get(name) || this.put(name);

    return nested.put(restPath, packageJson);
  }

  toString(): string {
    return this.path;
  }

}

/**
 * @internal
 */
function pathNameAndRest(path: string): [string, string?] {

  const slashIdx = path.indexOf('/');

  return slashIdx < 0 ? [path] : [path.substr(0, slashIdx), path.substr(slashIdx + 1)];
}
