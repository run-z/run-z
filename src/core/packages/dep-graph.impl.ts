/**
 * @packageDocumentation
 * @module run-z
 */
import { valueProvider } from '@proc7ts/primitives';
import { ZDepGraph, ZDepPriority } from './dep-graph';
import type { ZPackage$ } from './package.impl';

/**
 * @internal
 */
export class ZDepGraph$ implements ZDepGraph {

  constructor(readonly target: ZPackage$) {
  }

  directDependencies(): ReadonlyMap<string, ZDepGraph$.Node> {

    const priorities = new Map<string, ZDepPriority>();
    const addDep = (dep: string, priority: ZDepPriority): void => {

      const prevPriority = priorities.get(dep);

      if (prevPriority) {
        if (priority === ZDepPriority.Peer && prevPriority === ZDepPriority.Dev) {
          priority = ZDepPriority.DevAndPeer;
        } else {
          return;
        }
      }

      priorities.set(dep, priority);
    };
    const prioritize = (
        deps: Readonly<Record<string, string>> | undefined,
        priority: ZDepPriority,
    ): void => {
      if (!deps) {
        return;
      }
      for (const dep of Object.keys(deps)) {
        addDep(dep, priority);
      }
    };


    const { packageJson, hostPackage } = this.target;

    prioritize(packageJson.dependencies, ZDepPriority.Runtime);
    prioritize(packageJson.devDependencies, ZDepPriority.Dev);
    prioritize(packageJson.peerDependencies, ZDepPriority.Peer);
    if (hostPackage !== this.target) {
      addDep(hostPackage.name, ZDepPriority.Host);
    }

    const resolver = this.target._resolver;
    const result = new Map<string, ZDepGraph$.Node>();

    for (const [name, priority] of priorities.entries()) {

      const named = resolver.byName(name);

      if (named) {
        result.set(name, [named, priority, 1]);
        named._addDependant([this.target, priority, 1]);
      }
    }

    this.directDependencies = valueProvider(result); // Cache result

    return result;
  }

  deepDependencies(): ReadonlyMap<string, ZDepGraph$.Node> {

    const result = new Map<string, ZDepGraph$.Node>();

    result.set(this.target.name, [this.target, ZDepPriority.Max, 0]);
    this._deepDependencies(result, ZDepPriority.Max, 1);
    result.delete(this.target.name);
    this.deepDependencies = valueProvider(result);

    return result;
  }

  sortedDependencies(): readonly ZDepGraph$.Node[] {

    const result = Array.from(this.deepDependencies().values()).sort(compareZDeps.bind(undefined, true));

    this.sortedDependencies = valueProvider(result);

    return result;
  }

  private _deepDependencies(
      result: Map<string, ZDepGraph$.Node>,
      depth: number,
      maxPriority: ZDepPriority,
  ): void {

    const newDepth = depth + 1;

    for (const [dep,, priority] of this.directDependencies().values()) {

      const newPriority = Math.min(maxPriority, priority);
      const prev = result.get(dep.name);

      if (prev) {

        const [, prevPriority, prevDepth] = prev;

        if (prevPriority > newPriority) {
          continue;
        }
        if (prevDepth <= newDepth) {
          continue;
        }
      }

      result.set(dep.name, [dep, newPriority, depth]);
      dep.depGraph()._deepDependencies(result, newDepth, newPriority);
    }
  }

  directDependants(): ReadonlyMap<string, ZDepGraph$.Node> {
    return this.target._dependants;
  }

  deepDependants(): ReadonlyMap<string, ZDepGraph$.Node> {

    const result = new Map<string, ZDepGraph$.Node>();

    result.set(this.target.name, [this.target, ZDepPriority.Max, 0]);
    this._deepDependants(result, ZDepPriority.Max, 1);
    result.delete(this.target.name);
    this.deepDependants = valueProvider(result);

    return result;
  }

  sortedDependants(): readonly ZDepGraph.Node[] {

    const result = Array.from(this.deepDependants().values()).sort(compareZDeps.bind(undefined, false));

    this.sortedDependants = valueProvider(result);

    return result;
  }

  private _deepDependants(
      result: Map<string, ZDepGraph$.Node>,
      depth: number,
      maxPriority: ZDepPriority,
  ): void {

    const newDepth = depth + 1;

    for (const [dep,, priority] of this.directDependants().values()) {

      const newPriority = Math.min(maxPriority, priority);
      const prev = result.get(dep.name);

      if (prev) {

        const [, prevPriority, prevDepth] = prev;

        if (prevPriority > newPriority) {
          continue;
        }
        if (prevDepth <= newDepth) {
          continue;
        }
      }

      result.set(dep.name, [dep, newPriority, depth]);
      dep.depGraph()._deepDependants(result, newDepth, newPriority);
    }
  }

}

/**
 * @internal
 */
export namespace ZDepGraph$ {

  export type Node = readonly [ZPackage$, ZDepPriority, number];

}

/**
 * @internal
 */
function compareZDeps(
    deepFirst: boolean,
    [{ name: n1 }, p1, d1]: ZDepGraph$.Node,
    [{ name: n2 }, p2, d2]: ZDepGraph$.Node,
): number {

  const dp = p2 - p1;

  if (dp) {
    return dp;
  }

  const dd = d2 - d1;

  if (dd) {
    return deepFirst ? dd : -dd;
  }

  return n2 < n1 ? -1 : (n2 > n1 ? 1 : 0);
}
