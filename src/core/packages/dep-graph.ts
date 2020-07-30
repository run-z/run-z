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
   * Iterates over package dependencies in deepest-first order.
   *
   * @returns An iterable of dependency packages.
   */
  dependencies(): Iterable<ZPackage>;

  /**
   * Iterates over package dependants in deepest-last order.
   *
   * @returns An iterable of dependent packages.
   */
  dependants(): Iterable<ZPackage>;

}
