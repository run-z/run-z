/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZSetup } from '../setup';
import { ZTask, ZTaskSpec } from '../tasks';
import type { ZPackageLocation } from './package-location';
import { ZPackageSet } from './package-set';
import type { ZPackageJson } from './package.json';

/**
 * NPM package containing tasks and rules.
 */
export class ZPackage extends ZPackageSet {

  /**
   * Full package name.
   */
  readonly name: string;

  private _scopeName: string | null | undefined = null;
  private _unscopedName?: string;
  private _hostPackage?: ZPackage;
  private _subPackageName: string | null | undefined = null;
  private readonly _tasks = new Map<string, ZTask>();

  /**
   * Constructs a package.
   *
   * @param setup  `run-z` setup.
   * @param location  Package location.
   * @param packageJson  `package.json` contents.
   * @param parent  Parent NPM package.
   */
  constructor(
      readonly setup: ZSetup,
      readonly location: ZPackageLocation,
      readonly packageJson: ZPackageJson,
      readonly parent?: ZPackage,
  ) {
    super();

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

    for (const [key, value] of Object.entries(scripts)) {

      const spec = this.setup.taskParser.parse(value);

      this._tasks.set(key, new ZTask(this, key, spec));
    }
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
   * Selects packages matching the given selector relatively to this one.
   *
   * The selector uses `/` symbols as path separator.
   *
   * It may include `//` to include all immediately nested packages, or `///` to include all deeply nested packages.
   *
   * @param selector  Package selector.
   *
   * @returns Selected package set.
   */
  select(selector: string): ZPackageSet {
    return new ResolvedZPackages(this, selector);
  }

  task(name: string): ZTask {

    const existing = this._tasks.get(name);

    if (existing) {
      return existing;
    }

    const absent = new ZTask(this, name, ZTaskSpec.noop);

    this._tasks.set(name, absent);

    return absent;
  }

}

/**
 * @internal
 */
class ResolvedZPackages extends ZPackageSet {

  constructor(readonly pkg: ZPackage, readonly selector: string) {
    super();
  }

  async *packages(): AsyncIterable<ZPackage> {
    for await (const l of this.pkg.location.select(this.selector)) {

      const resolved = await this.pkg.setup.packageResolver.find(l);

      if (resolved) {
        yield resolved;
      }
    }
  }

}
