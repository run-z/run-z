import type { ZSetup } from '../setup.js';
import type { ZPackage } from './package.js';
import type { ZPackageLocation } from './package-location.js';
import { ZPackage$, ZPackageResolver$ } from './package.impl.js';
import { UnknownZPackageError } from './unknown-package-error.js';

/**
 * A resolver of all discovered {@link ZPackage NPM packages}.
 */
export class ZPackageResolver {

  private readonly _byPath = new Map<string, Promise<ZPackage$ | undefined>>();
  private readonly _impl: ZPackageResolver$;

  /**
   * Constructs NPM package resolver.
   *
   * @param setup - Task execution setup.
   */
  constructor(readonly setup: ZSetup) {
    const byName = new Map<string, Set<ZPackage$>>();
    let depGraphRev = 0;

    this._impl = {
      setup,
      rev: 0,
      addPackage(pkg: ZPackage$): void {
        if (!pkg.isAnonymous) {
          const { name } = pkg;
          let named = byName.get(name);

          if (!named) {
            byName.set(name, (named = new Set<ZPackage$>()));
          }

          named.add(pkg);
        }
      },
      byName: name => {
        const packages = byName.get(name);

        return packages ? [...packages] : [];
      },
      buildDepGraph() {
        if (this.rev !== depGraphRev) {
          depGraphRev = this.rev;
          for (const namedPackages of byName.values()) {
            for (const namedPackage of namedPackages) {
              namedPackage.depGraph()._init();
            }
          }
        }
      },
    };
  }

  /**
   * Resolves package by its location.
   *
   * @param location - Package location.
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
   * @param location - Package location.
   *
   * @returns A promise resolved to package or `undefined` if there is no such package.
   */
  find(location: ZPackageLocation): Promise<ZPackage | undefined> {
    const existing = this._byPath.get(location.path);

    if (existing) {
      return existing;
    }

    const findParent = async (
      location: ZPackageLocation | undefined,
    ): Promise<ZPackage | undefined> => {
      if (!location) {
        return;
      }

      return (await this.find(location)) || findParent(location.parent);
    };
    const discoverPackage = async (): Promise<ZPackage$ | undefined> => {
      const parent = await findParent(location.parent);
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
   * @param name - Package name.
   *
   * @returns An iterable of packages with requested name.
   */
  byName(name: string): readonly ZPackage[] {
    return this._impl.byName(name);
  }

}
