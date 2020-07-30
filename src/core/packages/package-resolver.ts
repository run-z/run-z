/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZSetup } from '../setup';
import type { ZPackage } from './package';
import type { ZPackageLocation } from './package-location';
import { ZPackage$, ZPackageResolver$ } from './package.impl';
import { UnknownZPackageError } from './unknown-package-error';

/**
 * A resolver of all discovered {@link ZPackage NPM packages}.
 */
export class ZPackageResolver {

  private readonly _byPath = new Map<string, Promise<ZPackage$ | undefined>>();
  private readonly _impl: ZPackageResolver$;

  /**
   * Constructs NPM package resolver.
   *
   * @param setup  Task execution setup.
   */
  constructor(readonly setup: ZSetup) {

    const byName = new Map<string, ZPackage$>();
    let depGraphRev = 0;

    this._impl = {
      setup,
      rev: 0,
      addPackage(pkg: ZPackage$): void {
        if (!pkg.isAnonymous) {
          byName.set(pkg.name, pkg);
        }
      },
      byName: name => byName.get(name),
      buildDepGraph() {
        if (this.rev !== depGraphRev) {
          depGraphRev = this.rev;
          for (const pkg of byName.values()) {
            pkg.depGraph()._init();
          }
        }
      },
    };
  }

  /**
   * Resolves package by its location.
   *
   * @param location  Package location.
   *
   * @returns A promise resolved to package.
   */
  async get(location: ZPackageLocation): Promise<ZPackage> {

    const found = await this.find(location);

    return found || Promise.reject(new UnknownZPackageError(location.path));
  }

  /**
   * Searches for package by its location.
   *
   * @param location  Package location.
   *
   * @returns A promise resolved to package or `undefined` if there is no such package.
   */
  find(location: ZPackageLocation): Promise<ZPackage | undefined> {

    const existing = this._byPath.get(location.path);

    if (existing) {
      return existing;
    }

    const discoverPackage = async (): Promise<ZPackage$ | undefined> => {

      const parentLocation = location.parent;
      const parent = parentLocation && await this.find(parentLocation);
      const packageJson = await location.load();

      if (!packageJson) {
        return;
      }

      ++this._impl.rev;

      return new ZPackage$(this._impl, location, packageJson, parent);
    };

    const discovered = discoverPackage().then(pkg => {
      if (pkg) {
        this._impl.addPackage(pkg);
      }
      return pkg;
    });

    this._byPath.set(location.path, discovered);

    return discovered;
  }

  /**
   * Searches for resolved package by its name.
   *
   * @param name  Package name.
   *
   * @returns Either resolved package with the given name, or `undefined` if that package is unknown.
   */
  byName(name: string): ZPackage | undefined {
    return this._impl.byName(name);
  }

}
