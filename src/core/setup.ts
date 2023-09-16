import { asArray, valueByRecipe } from '@proc7ts/primitives';
import type { ZConfig } from './config.js';
import type { ZExtension } from './extension.js';
import { ZPackageResolver } from './packages/package-resolver.js';
import { ZPlanner } from './plan/planner.js';
import { ZTaskFactory } from './tasks/task-factory.js';
import { ZTaskParser } from './tasks/task-parser.js';

/**
 * Task execution setup.
 *
 * Provides access to all task execution services.
 */
export class ZSetup {

  /**
   * @internal
   */
  readonly #config: ZConfig;

  /**
   * @internal
   */
  #taskParser?: ZTaskParser | undefined;

  /**
   * @internal
   */
  #taskFactory?: ZTaskFactory | undefined;

  /**
   * @internal
   */
  #packageResolver?: ZPackageResolver | undefined;

  /**
   * @internal
   */
  #planner?: ZPlanner | undefined;

  /**
   * Constructs setup instance.
   *
   * @param config - Task execution configuration.
   */
  constructor(config: ZConfig = {}) {
    this.#config = config;
  }

  /**
   * Task specifier parser.
   */
  get taskParser(): ZTaskParser {
    return (
      this.#taskParser
      || (this.#taskParser = this.#config.taskParser
        ? valueByRecipe(this.#config.taskParser, this)
        : new ZTaskParser({
            options: this.extensions.flatMap(extension => asArray(extension.options)),
          }))
    );
  }

  /**
   * Task factory.
   */
  get taskFactory(): ZTaskFactory {
    return (
      this.#taskFactory
      || (this.#taskFactory = this.#config.taskFactory
        ? valueByRecipe(this.#config.taskFactory, this)
        : new ZTaskFactory())
    );
  }

  /**
   * A resolver of all discovered {@link ZPackage NPM packages}.
   */
  get packageResolver(): ZPackageResolver {
    return (
      this.#packageResolver
      || (this.#packageResolver = this.#config.packageResolver
        ? valueByRecipe(this.#config.packageResolver, this)
        : new ZPackageResolver(this))
    );
  }

  /**
   * Task execution planner.
   */
  get planner(): ZPlanner {
    return (
      this.#planner
      || (this.#planner = this.#config.planner
        ? valueByRecipe(this.#config.planner, this)
        : new ZPlanner(this))
    );
  }

  /**
   * Task execution functionality extensions.
   */
  get extensions(): readonly ZExtension[] {
    return asArray(this.#config.extensions);
  }

}
