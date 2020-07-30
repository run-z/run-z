/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZSetup } from '../setup';
import type { ZTask } from '../tasks';
import type { ZPackageLocation } from './package-location';
import type { ZPackageSet } from './package-set';
import type { ZPackageJson } from './package.json';

/**
 * NPM package containing tasks and rules.
 */
export interface ZPackage extends ZPackageSet {

  /**
   * Task execution setup.
   */
  readonly setup: ZSetup;

  /**
   * Package location.
   */
  readonly location: ZPackageLocation;

  /**
   * Parent NPM package.
   */
  readonly parent?: ZPackage;

  /**
   * Full package name.
   */
  readonly name: string;

  /**
   * `package.json` contents.
   */
  readonly packageJson: ZPackageJson;

  /**
   * Package scope name including leading `@` for scoped packages, or `undefined` for unscoped ones.
   */
  readonly scopeName?: string;

  /**
   * Unscoped package name for scoped packages, or full package names for unscoped ones.
   */
  readonly unscopedName: string;

  /**
   * Host package for sub-packages, or this package for top-level ones.
   */
  readonly hostPackage: ZPackage;

  /**
   * Sub-package name for nested packages, or `undefined` for top-level ones.
   */
  readonly subPackageName?: string;

  /**
   * An iterable consisting of this package.
   */
  packages(): Iterable<this>;

  /**
   * Selects packages matching the given selector relatively to this one.
   *
   * The selector uses `/` symbols as path separator.
   *
   * It may include `//` to include all immediately nested packages, or `///` to include all deeply nested packages.
   *
   * @param selector  Package selector.
   *
   * @returns Selected package set.
   */
  select(selector: string): ZPackageSet;

  /**
   * Returns a task by its name.
   *
   * @param name  Task name.
   *
   * @returns A promise resolved to task instance. May have {@link ZTaskSpec.Unknown unknown action} if the task is not
   * present in `scripts` section of {@link packageJson `package.json`}.
   */
  task(name: string): Promise<ZTask>;

}
