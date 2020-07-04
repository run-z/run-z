/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackageJson } from './package.json';

/**
 * Potential NPM packages location.
 *
 * E.g. a directory containing `package.json` file.
 */
export interface ZPackageLocation {

  /**
   * Parent package location or `undefined` if there is no parent location.
   */
  readonly parent: ZPackageLocation | undefined;

  /**
   * A path specific to this location.
   *
   * Two locations with the same paths considered equal.
   */
  readonly path: string;

  /**
   * Base name of the package path.
   *
   * I.e. the last segment of the [[path]].
   */
  readonly baseName: string;

  /**
   * Constructs location relatively to this one.
   *
   * @param path  Relative path starting with `./` or `../` and using `/` as directory separators.
   *
   * @returns Either relative location, or `undefined` if the given `path` does not lead to package location.
   */
  relative(path: string): ZPackageLocation | undefined;

  /**
   * Lists nested package locations.
   *
   * @returns Async iterable of all package locations immediately nested in this one one.
   */
  nested(): AsyncIterable<ZPackageLocation>

  /**
   * Lists deeply nested package locations.
   *
   * @returns Async iterable of all package locations nested in this one or deeper.
   */
  deeplyNested(): AsyncIterable<ZPackageLocation>;

  /**
   * Tries to load `package.json` from this location.
   *
   * @returns A promise resolved to either `package.json` file, or to `undefined` if this location does not contain
   * NPM package.
   */
  load(): Promise<ZPackageJson | undefined>;

}
