/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from './package';

/**
 * Package dependency graph.
 */
export interface ZDepGraph {

  /**
   * Iterates over package dependencies in dependencies-first order.
   *
   * @returns An iterable of dependency packages.
   */
  dependencies(): Iterable<ZPackage>;

  /**
   * Iterates over package dependants in dependencies-last order.
   *
   * @returns An iterable of dependent packages.
   */
  dependants(): Iterable<ZPackage>;

}
