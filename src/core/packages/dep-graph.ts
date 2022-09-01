import type { ZPackage } from './package';

/**
 * Package dependency graph.
 */
export interface ZDepGraph {
  /**
   * Iterates over package dependencies in dependencies-first order.
   *
   * @returns A read-only set of dependency packages.
   */
  dependencies(): ReadonlySet<ZPackage>;

  /**
   * Iterates over package dependants in dependencies-last order.
   *
   * @returns A read-only set of dependent packages.
   */
  dependants(): ReadonlySet<ZPackage>;
}
