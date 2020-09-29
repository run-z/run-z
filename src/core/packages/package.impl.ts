import { isPresent } from '@proc7ts/primitives';
import { filterIt, mapIt } from '@proc7ts/push-iterator';
import type { ZSetup } from '../setup';
import type { ZTask } from '../tasks';
import { ZTaskSpec } from '../tasks';
import { ZDepGraph$ } from './dep-graph.impl';
import type { ZPackage } from './package';
import type { ZPackageLocation } from './package-location';
import { ZPackageSet } from './package-set';
import type { ZPackageJson } from './package.json';

/**
 * @internal
 */
export interface ZPackageResolver$ {
  readonly setup: ZSetup;
  rev: number;
  addPackage(pkg: ZPackage$): void;
  byName(name: string): Iterable<ZPackage$>;
  buildDepGraph(): void;
}

/**
 * @internal
 */
export class ZPackage$ extends ZPackageSet implements ZPackage {

  readonly isAnonymous: boolean;
  readonly name: string;
  private _scopeName: string | null | undefined = null;
  private _unscopedName?: string;
  private _hostPackage?: ZPackage;
  private _subPackageName: string | null | undefined = null;

  readonly _dependants: ZPackage$[] = [];
  private _depGraph: [number, ZDepGraph$];

  private readonly _tasks = new Map<string, Promise<ZTask>>();

  constructor(
      readonly _resolver: ZPackageResolver$,
      readonly location: ZPackageLocation,
      readonly packageJson: ZPackageJson,
      readonly parent?: ZPackage,
  ) {
    super();

    const packageName = this.packageJson.name;

    if (packageName) {
      this.name = packageName;
      this.isAnonymous = false;
    } else if (parent) {

      const dirName = location.urlPath.substr(parent.location.urlPath.length);

      this.name = `${parent.name}${dirName}`;
      this.isAnonymous = parent.isAnonymous;
    } else {
      this.name = location.baseName;
      this.isAnonymous = true;
    }

    this._depGraph = [_resolver.rev, new ZDepGraph$(this)];
  }

  get setup(): ZSetup {
    return this._resolver.setup;
  }

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

  get unscopedName(): string {
    if (this._unscopedName != null) {
      return this._unscopedName;
    }

    const { scopeName, name } = this;

    return this._unscopedName = scopeName == null
        ? name
        : name.substr(scopeName.length + 1);
  }

  get hostPackage(): ZPackage {
    if (this._hostPackage) {
      return this._hostPackage;
    }
    return this._hostPackage = this.subPackageName == null
        ? this
        : this.parent!.hostPackage;
  }

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

  packages(): Iterable<this> {
    return [this];
  }

  depGraph(): ZDepGraph$ {

    const [rev, deps] = this._depGraph;
    const newRev = this._resolver.rev;

    if (rev === newRev) {
      return deps;
    }

    const newDeps = new ZDepGraph$(this);

    this._depGraph = [newRev, newDeps];

    return newDeps;
  }

  select(selector: string): ZPackageSet {
    return new SelectedZPackages(this, selector);
  }

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

  taskNames(): Iterable<string> {

    const { scripts = {} } = this.packageJson;

    return Object.keys(scripts);
  }

  toString(): string {
    return this.name;
  }

  _addDependant(dependant: ZPackage$): void {
    this._dependants.push(dependant);
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
