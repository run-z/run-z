/**
 * @packageDocumentation
 * @module run-z
 */
import { itsFirst, mapIt } from '@proc7ts/a-iterable';
import { valueProvider } from '@proc7ts/primitives';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL, URL } from 'url';
import { ZPackage } from './package';
import { ZPackageSet } from './package-set';
import { UnknownPackageError } from './unknown-package-error';

/**
 * A resolver of all discovered {@link ZPackage NPM packages}.
 */
export class ZPackageResolver {

  private _packages?: Promise<Map<string, ZPackage>>;
  private _sets?: Promise<Map<string, ZPackageSet>>;

  /**
   * Constructs NPM package resolver.
   *
   * @param currentURL  URL of current working directory.
   * @param rootURL  File system root all packages should be located within.
   */
  constructor(
      readonly currentURL: URL = pathToFileURL(process.cwd()),
      readonly rootURL: URL = new URL('file:///'),
  ) {
  }

  /**
   * Resolves package by its filesystem URL.
   *
   * @param url  Package URL.
   *
   * @returns A promise resolved to package.
   */
  async get(url: URL): Promise<ZPackage> {

    const packages = await this.packages;

    return packages.get(url.pathname) || Promise.reject(new UnknownPackageError(url.pathname));

  }

  /**
   * Resolves a package set known under the given name.
   *
   * @param name  Either package set name or relative package path starting with `./` or '../'.
   *
   * @returns A promise resolved to package set.
   */
  async resolve(name: string): Promise<ZPackageSet> {

    const sets = await this.sets;
    const target = name.startsWith('./') || name.startsWith('../')
        ? new URL(name, this.currentURL).pathname // Package path
        : name;

    return sets.get(target) || Promise.reject(new UnknownPackageError(name));
  }

  private get packages(): Promise<Map<string, ZPackage>> {
    return this._packages || (this._packages = this._discoverPackages());
  }

  private get sets(): Promise<Map<string, ZPackageSet>> {
    return this._sets || (this._sets = this._discoverSets());
  }

  private async _discoverPackages(): Promise<Map<string, ZPackage>> {

    const packages = new Map<string, ZPackage>();
    const discoverPackage = async (url: URL): Promise<ZPackage | undefined> => {
      if (!url.pathname.startsWith(this.rootURL.pathname)) {
        return;
      }

      const existing = packages.get(url.pathname);

      if (existing) {
        return existing;
      }

      const dir = fileURLToPath(url);
      const parent = await discoverPackage(pathToFileURL(path.dirname(dir)));
      const packageJsonPath = path.join(dir, 'package.json');
      const packageJsonExists = await fs.promises.access(
          packageJsonPath,
          fs.constants.R_OK,
      ).then(
          valueProvider(true),
          valueProvider(false),
      );

      if (!packageJsonExists) {
        return parent;
      }

      const packageJson = JSON.parse((await fs.promises.readFile(packageJsonPath)).toString());
      const pkg = new ZPackage(url, packageJson, parent);

      packages.set(url.pathname, pkg);

      return pkg;
    };

    await discoverPackage(this.currentURL);

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
