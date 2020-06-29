/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from './package';

/**
 * A set of {@link ZPackage NPM packages} known under the same name.
 */
export class ZPackageSet {

  /**
   * Constructs package set.
   *
   * @param name  A name of this package set.
   * @param packages  An iterable of packages this set consists of.
   */
  constructor(
      readonly name: string,
      readonly packages: Iterable<ZPackage>,
  ) {
  }

}
