/**
 * @packageDocumentation
 * @module run-z
 */
import { itsFirst, mapIt } from '@proc7ts/a-iterable';
import { ZPackage } from './package';
import type { ZPackageLocation } from './package-location';
import { ZPackageSet } from './package-set';
import { UnknownZPackageError } from './unknown-package-error';

/**
 * A resolver of all discovered {@link ZPackage NPM packages}.
 */
export class ZPackageResolver {

  private _packages?: Promise<Map<string, ZPackage>>;
  private _sets?: Promise<Map<string, ZPackageSet>>;

  /**
   * Constructs NPM package resolver.
   *
   * @param currentLocation  Current location to start package discovery from.
   */
  constructor(readonly currentLocation: ZPackageLocation) {
  }

  /**
   * Resolves package by its location.
   *
   * @param location  Package location.
   *
   * @returns A promise resolved to package.
   */
  async get(location: ZPackageLocation): Promise<ZPackage> {

    const packages = await this.packages;

    return packages.get(location.path) || Promise.reject(new UnknownZPackageError(location.path));
  }

  /**
   * Resolves a package set known under the given name.
   *
   * @param name  Either package set name or relative {@link ZTaskSpec.isPackagePath path to package}.
   *
   * @returns A promise resolved to package set.
   */
  async resolve(name: string): Promise<ZPackageSet> {

    const sets = await this.sets;
    const target = name.startsWith('./') || name.startsWith('../') // Relative package path?
        ? this.currentLocation.relative(name)?.path
        : name;

    return target && sets.get(target) || Promise.reject(new UnknownZPackageError(name));
  }

  private get packages(): Promise<Map<string, ZPackage>> {
    return this._packages || (this._packages = this._discoverPackages());
  }

  private get sets(): Promise<Map<string, ZPackageSet>> {
    return this._sets || (this._sets = this._discoverSets());
  }

  private async _discoverPackages(): Promise<Map<string, ZPackage>> {

    const packages = new Map<string, ZPackage>();
    const discoverPackage = async (location: ZPackageLocation): Promise<ZPackage | undefined> => {

      const existing = packages.get(location.path);

      if (existing) {
        return existing;
      }

      const parentLocation = location.parent;
      const parent = parentLocation && await discoverPackage(parentLocation);
      const packageJson = await location.load();

      if (!packageJson) {
        return parent;
      }

      const pkg = new ZPackage(location, packageJson, parent);

      packages.set(location.path, pkg);

      return pkg;
    };

    await discoverPackage(this.currentLocation);

    return packages;
  }

  private async _discoverSets(): Promise<Map<string, ZPackageSet>> {

    const packages = await this.packages;
    const sets = new Map<string, Set<ZPackage>>();
    const addPackage = (name: string, pkg: ZPackage): void => {

      const pkgSet = sets.get(name);

      if (pkgSet) {
        pkgSet.add(pkg);
      } else {
        sets.set(name, new Set<ZPackage>().add(pkg));
      }
    };

    for (const [url, pkg] of packages.entries()) {
      addPackage(url, pkg);

      // Add aliases
      for (const alias of pkg.aliases) {
        addPackage(alias, pkg);
      }

      const { scopeName } = pkg;

      if (scopeName) {
        // Add scoped package to @scope set
        addPackage(scopeName, pkg);
      }

      // Add sub-package to host package set
      addPackage(pkg.hostPackage.name, pkg);
    }

    return new Map<string, ZPackageSet>(
        mapIt(
            sets.entries(),
            ([name, packages]) => [
              name,
              packages.size === 1
                  ? itsFirst(packages.values())!
                  : new ZPackageSet(name, Array.from(packages)),
            ],
        ),
    );
  }

}
