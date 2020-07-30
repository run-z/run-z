/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from './package';

/**
 * Package dependency priority.
 *
 * Used to resolve recursive dependencies. E.g. when `packageA` is a runtime dependency on `packageB` and `packageB`
 * is a development dependency of `packageA`, the former dependency wins.
 */
export const enum ZDepPriority {

  /**
   * Enclosing (host) package dependency.
   */
  Host = -5,

  /**
   * Peer dependency.
   */
  Peer = -4,

  /**
   * Development dependency.
   */
  Dev = -3,

  /**
   * Both development and peer dependency.
   */
  DevAndPeer= -2,

  /**
   * Runtime dependency.
   */
  Runtime = -1,

  /**
   * Forced dependency.
   */
  Forced = 1,

  /**
   * Maximum priority.
   */
  Max = 127,

}

/**
 * Package dependency graph.
 */
export interface ZDepGraph {

  /**
   * Evaluates direct dependencies of the package.
   *
   * @returns A read-only map of dependency graph nodes with their package names as keys.
   */
  directDependencies(): ReadonlyMap<string, ZDepGraph.Node>;

  /**
   * Evaluates deep dependencies of the package, including transitive ones.
   *
   * @returns A read-only map of dependency graph nodes with their package names as keys.
   */
  deepDependencies(): ReadonlyMap<string, ZDepGraph.Node>;

  /**
   * Sorts dependencies by priority-first, then deepest-first order.
   *
   * @returns A read-only array of dependency graph nodes.
   */
  sortedDependencies(): readonly ZDepGraph.Node[];

  /**
   * Evaluates direct dependants of the package.
   *
   * @returns A read-only map of dependency graph nodes with their package names as keys.
   */
  directDependants(): ReadonlyMap<string, ZDepGraph.Node>;

  /**
   * Evaluates deep dependants of the package, including transitive ones.
   *
   * @returns A read-only map of dependency graph nodes with their package names as keys.
   */
  deepDependants(): ReadonlyMap<string, ZDepGraph.Node>;

  /**
   * Sorts dependants by priority-first, then deepest-last order.
   *
   * @returns A read-only array of dependency graph nodes.
   */
  sortedDependants(): readonly ZDepGraph.Node[];

}


export namespace ZDepGraph {

  /**
   * Package dependency graph node.
   *
   * A read-only tuple consisting of package, dependency depth, and dependency priority.
   */
  export type Node = readonly [ZPackage, ZDepPriority, number];

}
