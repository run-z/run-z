import type { ZPackageJson } from './package.json';

/**
 * Potential NPM packages location.
 *
 * E.g. a directory containing `package.json` file.
 */
export abstract class ZPackageLocation {

  /**
   * Parent package location or `undefined` if there is no parent location.
   */
  abstract readonly parent: ZPackageLocation | undefined;

  /**
   * A path specific to this location.
   *
   * Two locations with the same paths considered equal.
   */
  abstract readonly path: string;

  /**
   * A path specific to this location in URL format.
   */
  abstract readonly urlPath: string;

  /**
   * Base name of the package path.
   *
   * I.e. the last segment of the {@link path}.
   */
  abstract readonly baseName: string;

  /**
   * Constructs location relatively to this one.
   *
   * @param path - Relative path starting with `./` or `../` and using `/` as directory separators.
   *
   * @returns Either relative location, or `undefined` if the given `path` does not lead to package location.
   */
  abstract relative(path: string): ZPackageLocation | undefined;

  /**
   * Lists nested package locations.
   *
   * @returns Either an iterable of all package locations immediately nested in this one one, or a promise-like
   * instance resolving to one.
   */
  abstract nested(): readonly ZPackageLocation[] | Promise<readonly ZPackageLocation[]>;

  /**
   * Lists deeply nested package locations.
   *
   * @returns Either an iterable of all package locations nested in this one or deeper, or a promise-like instance
   * resolving to one.
   */
  abstract deeplyNested(): readonly ZPackageLocation[] | Promise<readonly ZPackageLocation[]>;

  /**
   * Tries to load `package.json` from this location.
   *
   * @returns A promise resolved to either `package.json` file, or to `undefined` if this location does not contain
   * NPM package.
   */
  abstract load(): Promise<ZPackageJson | undefined>;

  /**
   * Selects package locations matching the given selector relatively to this one.
   *
   * The selector uses `/` symbols as path separator.
   *
   * It may include `//` to include all immediately nested packages, or `///` to include all deeply nested packages.
   *
   * @param selector - Package selector.
   *
   * @returns A promise resolving to iterable of matching package locations.
   */
  async select(selector: string): Promise<readonly ZPackageLocation[]> {
    const index = selector.indexOf('//');

    if (index < 0) {
      const relative = this.relative(selector);

      return relative ? [relative] : [];
    }

    const prefix = selector.substr(0, index);
    const deep = selector.substr(index, 3) === '///';
    const suffix = selector.substr(deep ? index + 3 : index + 2);
    const root = this.relative(prefix);

    if (!root) {
      return [];
    }

    const allNested: readonly ZPackageLocation[] = deep
      ? await root.deeplyNested()
      : await root.nested();

    if (suffix) {
      return (await Promise.all(allNested.map(nested => nested.select(suffix)))).flat();
    }

    return deep ? [[root], allNested].flat() : allNested;
  }

}
