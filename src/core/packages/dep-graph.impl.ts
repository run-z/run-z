/**
 * @packageDocumentation
 * @module run-z
 */
import { filterIt } from '@proc7ts/a-iterable';
import { valueProvider } from '@proc7ts/primitives';
import type { ZDepGraph } from './dep-graph';
import type { ZPackage$, ZPackageResolver$ } from './package.impl';

/**
 * @internal
 */
export class ZDepGraph$ implements ZDepGraph {

  constructor(readonly target: ZPackage$) {
  }

  _init(): void {

    const reported = new Set<string>();

    for (const dep of zPackageDeps(reported, this.target, false)) {
      dep._addDependant(this.target);
    }
  }

  dependencies(): Iterable<ZPackage$> {

    const reported = new Set<string>();

    return zPackageDeps(reported, this.target);
  }

  *dependants(): Iterable<ZPackage$> {
    this.target._resolver.buildDepGraph();

    const allDependants = this._allDependants();
    const reported = new Set<string>();

    for (const dep of allDependants) {
      if (!reported.has(dep.name)) {
        reported.add(dep.name);
        yield* filterIt(
            zPackageDeps(reported, dep),
            d => allDependants.has(d),
        );
        yield dep;
      }
    }
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
function *zPackageDeps(
    reported: Set<string>,
    target: ZPackage$,
    deep = true,
): Iterable<ZPackage$> {

  const { _resolver: resolver } = target;
  const { packageJson } = target;
  const { devDependencies } = packageJson;

  yield* zPackageDepsOfKind(resolver, reported, packageJson.dependencies, deep);
  if (devDependencies) {
    yield* zPackageDepsOfKind(
        resolver,
        reported,
        packageJson.peerDependencies,
        deep,
        depName => devDependencies[depName] != null,
    );
    yield* zPackageDepsOfKind(resolver, reported, devDependencies, deep);
  }
  yield* zPackageDepsOfKind(resolver, reported, packageJson.peerDependencies, deep);
}

/**
 * @internal
 */
function *zPackageDepsOfKind(
    resolver: ZPackageResolver$,
    reported: Set<string>,
    deps: Readonly<Record<string, string>> | undefined,
    deep: boolean,
    filter: (depName: string) => boolean = valueProvider(true),
): Iterable<ZPackage$> {
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

    const dep = resolver.byName(depName);

    if (dep) {
      if (deep) {
        yield* zPackageDeps(reported, dep);
      }
      yield dep;
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
