import { filterIt, mapIt } from '@proc7ts/a-iterable';
import { isPresent } from '@proc7ts/primitives';
import type { ZSetup } from '../setup';
import type { ZTask } from '../tasks';
import { ZTaskSpec } from '../tasks';
import type { ZPackage } from './package';
import type { ZPackageLocation } from './package-location';
import { ZPackageSet } from './package-set';
import type { ZPackageJson } from './package.json';

/**
 * @internal
 */
export class ZPackage$ extends ZPackageSet implements ZPackage {

  /**
   * Full package name.
   */
  readonly name: string;

  private _scopeName: string | null | undefined = null;
  private _unscopedName?: string;
  private _hostPackage?: ZPackage;
  private _subPackageName: string | null | undefined = null;

  private readonly _tasks = new Map<string, Promise<ZTask>>();

  /**
   * Constructs a package.
   *
   * @param setup  Task execution setup.
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
    return new SelectedZPackages(this, selector);
  }

  /**
   * Returns a task by its name.
   *
   * @param name  Task name.
   *
   * @returns A promise resolved to task instance. May have {@link ZTaskSpec.Unknown unknown action} if the task is not
   * present in `scripts` section of {@link packageJson `package.json`}.
   */
  task(name: string): Promise<ZTask> {

    const existing = this._tasks.get(name);

    if (existing) {
      return existing;
    }

    const script = this.packageJson.scripts?.[name];

    if (script) {

      const parsed = this.setup.taskFactory.newTask(this, name)
          .parse(script)
          .then(builder => builder.task());

      this._tasks.set(name, parsed);

      return parsed;
    }

    const absent = Promise.resolve(this.setup.taskFactory.newTask(this, name)
        .setAction(ZTaskSpec.unknownAction)
        .task());

    this._tasks.set(name, absent);

    return absent;
  }

  toString(): string {
    return this.name;
  }

}

/**
 * @internal
 */
class SelectedZPackages extends ZPackageSet {

  constructor(readonly pkg: ZPackage, readonly selector: string) {
    super();
  }

  async packages(): Promise<Iterable<ZPackage>> {

    const locations = await this.pkg.location.select(this.selector);
    const found: (ZPackage | undefined)[] = await Promise.all(mapIt(
        locations,
        (location: ZPackageLocation) => this.pkg.setup.packageResolver.find(location),
    ));

    return filterIt<ZPackage | undefined, ZPackage>(found, isPresent);
  }

  toString(): string {
    return this.selector;
  }

}
