/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from './package';

/**
 * A set of {@link ZPackage NPM packages} known under the same name.
 */
export abstract class ZPackageSet {

  /**
   * Builds a packages set.
   *
   * @returns A possibly async iterable of packages this set consists of.
   */
  abstract packages(): Iterable<ZPackage> | AsyncIterable<ZPackage>;

}
