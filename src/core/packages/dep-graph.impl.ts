/**
 * @packageDocumentation
 * @module run-z
 */
import { valueProvider } from '@proc7ts/primitives';
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

    const reported = new Set<string>();
    const collected = new Set<ZPackage$>();

    zPackageDeps(reported, collected, this.target, false);

    for (const dep of collected) {
      dep._addDependant(this.target);
    }
  }

  dependencies(): ReadonlySet<ZPackage$> {
    if (this._dependencies) {
      return this._dependencies;
    }

    const reported = new Set<string>();
    const collected = new Set<ZPackage$>();

    zPackageDeps(reported, collected, this.target);

    return this._dependencies = collected;
  }

  dependants(): Set<ZPackage$> {
    if (this._dependants) {
      return this._dependants;
    }

    this.target._resolver.buildDepGraph();

    const allDependants = this._allDependants();
    const reported = new Set<string>();
    const collected = new Set<ZPackage$>();

    for (const dep of allDependants) {
      if (!reported.has(dep.name)) {
        reported.add(dep.name);

        const depCollected = new Set<ZPackage$>();

        zPackageDeps(reported, depCollected, dep, true);
        for (const d of depCollected) {
          if (allDependants.has(d)) {
            collected.add(d);
          }
        }
        collected.add(dep);
      }
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
    reported: Set<string>,
    collected: Set<ZPackage$>,
    target: ZPackage$,
    deep = true,
): void {

  const { _resolver: resolver } = target;
  const { packageJson } = target;
  const { devDependencies } = packageJson;

  zPackageDepsOfKind(resolver, reported, collected, packageJson.dependencies, deep);
  if (devDependencies) {
    zPackageDepsOfKind(
        resolver,
        reported,
        collected,
        packageJson.peerDependencies,
        deep,
        depName => devDependencies[depName] != null,
    );
    zPackageDepsOfKind(resolver, reported, collected, devDependencies, deep);
  }
  zPackageDepsOfKind(resolver, reported, collected, packageJson.peerDependencies, deep);
}

/**
 * @internal
 */
function zPackageDepsOfKind(
    resolver: ZPackageResolver$,
    reported: Set<string>,
    collected: Set<ZPackage$>,
    deps: Readonly<Record<string, string>> | undefined,
    deep: boolean,
    filter: (depName: string) => boolean = valueProvider(true),
): void {
  if (!deps) {
    return;
  }
  for (const depName of Object.keys(deps)) {
    if (reported.has(depName)) {
      continue;
    }
    if (!filter(depName)) {
      continue;
    }

    reported.add(depName);

    for (const dep of resolver.byName(depName)) {
      if (deep) {
        zPackageDeps(reported, collected, dep);
      }
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
