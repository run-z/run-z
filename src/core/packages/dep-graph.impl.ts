import { valueProvider } from '@proc7ts/primitives';
import semver from 'semver';
import type { ZDepGraph } from './dep-graph';
import type { ZPackage$, ZPackageResolver$ } from './package.impl';

/**
 * @internal
 */
export class ZDepGraph$ implements ZDepGraph {

  private _dependencies?: Set<ZPackage$>;
  private _dependants?: Set<ZPackage$>;

  constructor(readonly target: ZPackage$) {
  }

  _init(): void {

    const collected = new Set<ZPackage$>();

    zPackageDeps(collected, this.target, false);

    for (const dep of collected) {
      dep._addDependant(this.target);
    }
  }

  dependencies(): ReadonlySet<ZPackage$> {
    if (this._dependencies) {
      return this._dependencies;
    }

    const collected = new Set<ZPackage$>();

    zPackageDeps(collected, this.target);
    collected.delete(this.target);

    return this._dependencies = collected;
  }

  dependants(): Set<ZPackage$> {
    if (this._dependants) {
      return this._dependants;
    }

    this.target._resolver.buildDepGraph();

    const allDependants = this._allDependants();
    const collected = new Set<ZPackage$>();

    for (const dependant of allDependants) {
      if (collected.has(dependant)) {
        continue;
      }
      collected.add(dependant);

      const depsOfDependant = new Set<ZPackage$>();

      zPackageDeps(depsOfDependant, dependant, true);
      for (const depOfDependant of depsOfDependant) {
        if (allDependants.has(depOfDependant)) {
          collected.add(depOfDependant);
        }
      }

      // Make the dependant last
      collected.delete(dependant);
      collected.add(dependant);
    }

    return this._dependants = collected;
  }

  private _allDependants(): Set<ZPackage$> {

    const result = new Set<ZPackage$>();

    zPackageDependants(result, this.target);
    result.delete(this.target);
    this._allDependants = valueProvider(result);

    return result;
  }

}

/**
 * @internal
 */
function zPackageDeps(
    collected: Set<ZPackage$>,
    target: ZPackage$,
    deep = true,
): void {
  collected.add(target);

  const { _resolver: resolver } = target;
  const { packageJson } = target;
  const { devDependencies } = packageJson;

  zPackageDepsOfKind(resolver, collected, packageJson.dependencies, deep);
  if (devDependencies) {
    zPackageDepsOfKind(
        resolver,
        collected,
        packageJson.peerDependencies,
        deep,
        depName => devDependencies[depName] != null,
    );
    zPackageDepsOfKind(resolver, collected, devDependencies, deep);
  }
  zPackageDepsOfKind(resolver, collected, packageJson.peerDependencies, deep);
}

/**
 * @internal
 */
function zPackageDepsOfKind(
    resolver: ZPackageResolver$,
    collected: Set<ZPackage$>,
    deps: Readonly<Record<string, string>> | undefined,
    deep: boolean,
    filter: (depName: string) => boolean = valueProvider(true),
): void {
  if (!deps) {
    return;
  }
  for (const [depName, depRange] of Object.entries(deps)) {
    if (!filter(depName)) {
      continue;
    }

    const range = semver.validRange(depRange, true);

    for (const dep of resolver.byName(depName)) {
      if (collected.has(dep)) {
        continue;
      }

      if (range) {

        const version = semver.parse(dep.packageJson.version, true);

        if (version && !semver.satisfies(version, range, true)) {
          continue;
        }
      }

      collected.add(dep);
      if (deep) {
        zPackageDeps(collected, dep);
      }
      collected.delete(dep);
      collected.add(dep);
    }
  }
}

/**
 * @internal
 */
function zPackageDependants(result: Set<ZPackage$>, pkg: ZPackage$): void {
  if (result.has(pkg)) {
    return;
  }
  result.add(pkg);
  for (const dep of pkg._dependants) {
    zPackageDependants(result, dep);
  }
}
