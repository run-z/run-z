import { isPresent } from '@proc7ts/primitives';
import type { ZSetup } from '../setup.js';
import { ZTaskSpec } from '../tasks/task-spec.js';
import type { ZTask } from '../tasks/task.js';
import { ZDepGraph$ } from './dep-graph.impl.js';
import type { ZPackageLocation } from './package-location.js';
import { ZPackageSet } from './package-set.js';
import type { ZPackage } from './package.js';
import type { ZPackageJson } from './package.json.js';

/**
 * @internal
 */
export interface ZPackageResolver$ {
  readonly setup: ZSetup;
  rev: number;
  addPackage(pkg: ZPackage$): void;
  byName(name: string): readonly ZPackage$[];
  buildDepGraph(): void;
}

/**
 * @internal
 */
export class ZPackage$ extends ZPackageSet implements ZPackage {
  readonly isAnonymous: boolean;
  readonly name: string;
  #scopeName: string | null | undefined = null;
  #unscopedName?: string | undefined;
  #hostPackage?: ZPackage | undefined;
  #subPackageName: string | null | undefined = null;

  readonly _dependants: ZPackage$[] = [];
  #depGraph: [number, ZDepGraph$];

  readonly #tasks = new Map<string, Promise<ZTask>>();

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

    this.#depGraph = [_resolver.rev, new ZDepGraph$(this)];
  }

  get setup(): ZSetup {
    return this._resolver.setup;
  }

  get scopeName(): string | undefined {
    if (this.#scopeName !== null) {
      return this.#scopeName;
    }

    const { name } = this;

    if (name.startsWith('@')) {
      const slashIdx = name.indexOf('/');

      if (slashIdx >= 0) {
        return (this.#scopeName = name.substr(0, slashIdx));
      }
    }

    return (this.#scopeName = undefined);
  }

  get unscopedName(): string {
    if (this.#unscopedName != null) {
      return this.#unscopedName;
    }

    const { scopeName, name } = this;

    return (this.#unscopedName = scopeName == null ? name : name.substr(scopeName.length + 1));
  }

  get hostPackage(): ZPackage {
    if (this.#hostPackage) {
      return this.#hostPackage;
    }

    return (this.#hostPackage = this.subPackageName == null ? this : this.parent!.hostPackage);
  }

  get subPackageName(): string | undefined {
    if (this.#subPackageName !== null) {
      return this.#subPackageName;
    }

    const { unscopedName } = this;
    const slashIdx = unscopedName.indexOf('/');

    return (this.#subPackageName = slashIdx < 0 ? undefined : unscopedName.substr(slashIdx + 1));
  }

  packages(): readonly [this] {
    return [this];
  }

  depGraph(): ZDepGraph$ {
    const [rev, deps] = this.#depGraph;
    const newRev = this._resolver.rev;

    if (rev === newRev) {
      return deps;
    }

    const newDeps = new ZDepGraph$(this);

    this.#depGraph = [newRev, newDeps];

    return newDeps;
  }

  select(selector: string): ZPackageSet {
    return new SelectedZPackages(this, selector);
  }

  task(name: string): Promise<ZTask> {
    const existing = this.#tasks.get(name);

    if (existing) {
      return existing;
    }

    const script = this.packageJson.scripts?.[name];

    if (script) {
      const parsed = this.setup.taskFactory
        .newTask(this, name)
        .parse(script)
        .then(builder => builder.task());

      this.#tasks.set(name, parsed);

      return parsed;
    }

    const absent = Promise.resolve(
      this.setup.taskFactory.newTask(this, name).setAction(ZTaskSpec.unknownAction).task(),
    );

    this.#tasks.set(name, absent);

    return absent;
  }

  taskNames(): Iterable<string> {
    const { scripts = {} } = this.packageJson;

    return Object.keys(scripts);
  }

  override toString(): string {
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
  constructor(
    readonly pkg: ZPackage,
    readonly selector: string,
  ) {
    super();
  }

  async packages(): Promise<readonly ZPackage[]> {
    const locations = await this.pkg.location.select(this.selector);
    const found: (ZPackage | undefined)[] = await Promise.all(
      locations.map((location: ZPackageLocation) => this.pkg.setup.packageResolver.find(location)),
    );

    return found.filter(isPresent);
  }

  override toString(): string {
    return this.selector;
  }
}
