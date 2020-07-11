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
   * Lists packages of this set.
   *
   * @returns A possibly async iterable of packages this set consists of.
   */
  abstract packages(): Iterable<ZPackage> | AsyncIterable<ZPackage>;

  /**
   * Combines package sets.
   *
   * @param other  A package set co combine with this one.
   *
   * @returns A set of all packages from `this` and `other` package sets.
   */
  andPackages(other: ZPackageSet): ZPackageSet {
    return new CombinedZPackageSet([this, other]);
  }

}

/**
 * @internal
 */
class CombinedZPackageSet extends ZPackageSet {

  constructor(readonly sets: readonly ZPackageSet[]) {
    super();
  }

  *packages(): Iterable<ZPackage> | AsyncIterable<ZPackage> {
    for (const set of this.sets) {
      yield* set.packages();
    }
  }

  andPackages(other: ZPackageSet): ZPackageSet {
    return new CombinedZPackageSet([...this.sets, other]);
  }

}
