/**
 * @packageDocumentation
 * @module run-z
 */
import { ZTask } from '../tasks';
import type { ZPackageLocation } from './package-location';
import type { ZPackageResolver } from './package-resolver';
import { ZPackageSet } from './package-set';
import type { ZPackageJson } from './package.json';

/**
 * NPM package containing tasks and rules.
 */
export class ZPackage implements ZPackageSet {

  /**
   * Full package name.
   */
  readonly name: string;

  /**
   * Tasks hosted by this package.
   */
  readonly tasks: ReadonlyMap<string, ZTask>;

  private _scopeName: string | null | undefined = null;
  private _unscopedName?: string;
  private _hostPackage?: ZPackage;
  private _subPackageName: string | null | undefined = null;

  /**
   * Constructs a package.
   *
   * @param resolver  Package resolver.
   * @param location  Package location.
   * @param packageJson  `package.json` contents.
   * @param parent  Parent NPM package.
   */
  constructor(
      readonly resolver: ZPackageResolver,
      readonly location: ZPackageLocation,
      readonly packageJson: ZPackageJson,
      readonly parent?: ZPackage,
  ) {

    const packageName = this.packageJson.name;

    if (packageName) {
      this.name = packageName;
    } else if (parent) {

      const dirName = location.path.substr(parent.location.path.length);

      this.name = `${parent.name}${dirName}`;
    } else {
      this.name = location.baseName;
    }

    const { scripts = {} } = packageJson;
    const tasks = new Map<string, ZTask>();

    for (const [key, value] of Object.entries(scripts)) {

      const spec = this.resolver.taskParser.parse(value);

      tasks.set(key, new ZTask(this, key, spec));
    }

    this.tasks = tasks;
  }

  /**
   * Package scope name including leading `@` for scoped packages, or `undefined` for unscoped ones.
   */
  get scopeName(): string | undefined {
    if (this._scopeName !== null) {
      return this._scopeName;
    }

    const { name } = this;

    if (name.startsWith('@')) {

      const slashIdx = name.indexOf('/');

      if (slashIdx >= 0) {
        return this._scopeName = name.substr(0, slashIdx);
      }
    }

    return this._scopeName = undefined;
  }

  /**
   * Unscoped package name for scoped packages, or full package names for unscoped ones.
   */
  get unscopedName(): string {
    if (this._unscopedName != null) {
      return this._unscopedName;
    }

    const { scopeName, name } = this;

    return this._unscopedName = scopeName == null
        ? name
        : name.substr(scopeName.length + 1);
  }

  /**
   * Host package for sub-packages, or this package for top-level ones.
   */
  get hostPackage(): ZPackage {
    if (this._hostPackage) {
      return this._hostPackage;
    }
    return this._hostPackage = this.subPackageName == null
        ? this
        : this.parent!.hostPackage;
  }

  /**
   * Sub-package name for nested packages, or `undefined` for top-level ones.
   */
  get subPackageName(): string | undefined {
    if (this._subPackageName !== null) {
      return this._subPackageName;
    }

    const { unscopedName } = this;
    const slashIdx = unscopedName.indexOf('/');

    return this._subPackageName = slashIdx < 0
        ? undefined
        : unscopedName.substr(slashIdx + 1);
  }

  /**
   * An iterable consisting of this package.
   */
  packages(): Iterable<this> {
    return [this];
  }

  /**
   * Resolves packages located accordingly to the given pattern relatively to this package.
   *
   * Path pattern uses `/` symbols as path separator.
   *
   * It may include `//` to include all immediately nested packages, or `///` to include all deeply nested packages.
   *
   * @param pattern  Path pattern.
   *
   * @returns Resolved package set.
   */
  resolve(pattern: string): ZPackageSet {
    return new ResolvedZPackages(this, pattern);
  }

}

/**
 * @internal
 */
class ResolvedZPackages extends ZPackageSet {

  constructor(readonly pkg: ZPackage, readonly pattern: string) {
    super();
  }

  async *packages(): AsyncIterable<ZPackage> {
    for await (const l of this.pkg.location.resolve(this.pattern)) {

      const resolved = await this.pkg.resolver.find(l);

      if (resolved) {
        yield resolved;
      }
    }
  }

}
