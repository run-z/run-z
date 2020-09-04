/**
 * @packageDocumentation
 * @module run-z
 */
import { flatMapIt, mapIt } from '@proc7ts/a-iterable';
import type { ZPackage } from './package';

/**
 * A set of {@link ZPackage NPM packages} known under the same name.
 */
export abstract class ZPackageSet {

  /**
   * Lists packages of this set.
   *
   * @returns Either iterable of packages this set consists of, or a promise-like instance resolving to one.
   */
  abstract packages(): Iterable<ZPackage> | PromiseLike<Iterable<ZPackage>>;

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

  async packages(): Promise<Iterable<ZPackage>> {
    return flatMapIt(
        await Promise.all(
            mapIt(
                this.sets,
                set => set.packages(),
            ),
        ),
    );
  }

  andPackages(other: ZPackageSet): ZPackageSet {
    return new CombinedZPackageSet([...this.sets, other]);
  }

  toString(): string {
    return this.sets.join(' ');
  }

}
