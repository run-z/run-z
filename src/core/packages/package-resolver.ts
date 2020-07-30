/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZSetup } from '../setup';
import type { ZPackage } from './package';
import type { ZPackageLocation } from './package-location';
import { ZPackage$ } from './package.impl';
import { UnknownZPackageError } from './unknown-package-error';

/**
 * A resolver of all discovered {@link ZPackage NPM packages}.
 */
export class ZPackageResolver {

  /**
   * @internal
   */
  private readonly _packages = new Map<string, Promise<ZPackage$ | undefined>>();

  /**
   * Constructs NPM package resolver.
   *
   * @param setup  Task execution setup.
   */
  constructor(readonly setup: ZSetup) {
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
  async find(location: ZPackageLocation): Promise<ZPackage | undefined> {

    const existing = this._packages.get(location.path);

    if (existing) {
      return existing;
    }

    const discoverPackage = async (): Promise<ZPackage$ | undefined> => {

      const parentLocation = location.parent;
      const parent = parentLocation && await this.find(parentLocation);
      const packageJson = await location.load();

      return packageJson ? new ZPackage$(this.setup, location, packageJson, parent) : undefined;
    };

    const discovered = discoverPackage();

    this._packages.set(location.path, discovered);

    return discovered;
  }

}
