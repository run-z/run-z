import { ZPackage } from './package.js';

/**
 * A set of {@link ZPackage NPM packages} known under the same name.
 */
export abstract class ZPackageSet {

  /**
   * Lists packages of this set.
   *
   * @returns Either iterable of packages this set consists of, or a promise-like instance resolving to one.
   */
  abstract packages(): readonly ZPackage[] | PromiseLike<readonly ZPackage[]>;

  /**
   * Combines package sets.
   *
   * @param other - A package set co combine with this one.
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

  async packages(): Promise<readonly ZPackage[]> {
    return (await Promise.all(this.sets.map(set => set.packages()))).flat();
  }

  override andPackages(other: ZPackageSet): ZPackageSet {
    return new CombinedZPackageSet([...this.sets, other]);
  }

  override toString(): string {
    return this.sets.join(' ');
  }

}
