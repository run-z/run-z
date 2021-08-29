import { noop } from '@proc7ts/primitives';
import type { ZBatchRule } from './batch-rule';
import type { ZBatching } from './batching';

/**
 * Named batches selection control.
 */
export interface NamedZBatches {

  /**
   * A set of batch names to limit the package selection by.
   *
   * At least one of these batches should be defined in top level package, otherwise the build will be empty.
   *
   * All named batches except additional ones are used when absent.
   *
   * Corresponds to `--only` command line option.
   */
  readonly only: ReadonlySet<string> | undefined;

  /**
   * A set of additional batch names to use for package selection.
   *
   * This can be used to include additional batches into the build, excluded otherwise.
   *
   * Corresponds to `--with` command line option.
   */
  readonly with: ReadonlySet<string>;

  /**
   * A set of batch names to exclude from package selection.
   *
   * Corresponds to `--except` command line option.
   */
  readonly except: ReadonlySet<string>;

  /**
   * Assigns batch names to limit the package selection by.
   *
   * @param batchNames - An iterable of batch names to limit package selection by.
   *
   * @returns Updated batching policy.
   */
  setOnly(batchNames?: Iterable<string>): ZBatching;

  /**
   * Adds batch names to use for package selection.
   *
   * @param batchNames - An iterable of additional batch names.
   *
   * @returns Updated batching policy.
   */
  addWith(batchNames: Iterable<string>): ZBatching;

  /**
   * Add batch names to exclude from package selection.
   *
   * @param batchNames - An iterable of excluded batch names.
   *
   * @returns Updated batching policy.
   */
  addExcept(batchNames: Iterable<string>): ZBatching;

  /**
   * Resets named batches selection to the default one. I.e. all named batches except additional ones with `+`-prefixed
   * names.
   *
   * @returns Updated batching policy.
   */
  reset(): ZBatching;

}

/**
 * @internal
 */
interface NamedZBatchesConfig {

  readonly only?: ReadonlySet<string> | undefined;

  readonly with: ReadonlySet<string>;

  readonly except: ReadonlySet<string>;

}

/**
 * @internal
 */
class NamedZBatches$ implements NamedZBatches {

  static newBatchRule(
      context: ZBatchRule.Context<NamedZBatches>,
      config?: NamedZBatchesConfig,
  ): ZBatchRule.Instance<NamedZBatches$> {

    const control = new NamedZBatches$(context, config);

    return {
      control,
      moveTo(context) {
        return NamedZBatches$.newBatchRule(context, control);
      },
      processBatch: noop,
    };
  }

  readonly only: ReadonlySet<string> | undefined;
  readonly with: ReadonlySet<string>;
  readonly except: ReadonlySet<string>;

  constructor(
      private readonly _context: ZBatchRule.Context<NamedZBatches>,
      { only, with: w = new Set(), except = new Set() }: Partial<NamedZBatchesConfig> = {},
  ) {
    this.only = only;
    this.with = w;
    this.except = except;
  }

  setOnly(batchNames?: Iterable<string>): ZBatching {
    return this._context.updateInstance(context => NamedZBatches$.newBatchRule(
          context,
          {
            only: batchNames && new Set(batchNames),
            with: this.with,
            except: this.except,
          },
      ));
  }

  addWith(batchNames: Iterable<string>): ZBatching {
    return this._context.updateInstance(context => {

      const withBatches = new Set(this.with);

      for (const batchName of batchNames) {
        withBatches.add(batchName);
      }

      return NamedZBatches$.newBatchRule(
          context,
          {
            only: this.only,
            with: withBatches,
            except: this.except,
          },
      );
    });
  }

  addExcept(batchNames: Iterable<string>): ZBatching {
    return this._context.updateInstance(context => {

      const except = new Set(this.except);

      for (const batchName of batchNames) {
        except.add(batchName);
      }

      return NamedZBatches$.newBatchRule(
          context,
          {
            only: this.only,
            with: this.with,
            except,
          },
      );
    });
  }

  reset(): ZBatching {
    return this._context.updateInstance(noop);
  }

}

/**
 * Named batches selection rule.
 *
 * Configures {@link ZBatcher.batchNamed named batches} processing.
 */
export const NamedZBatches: ZBatchRule<NamedZBatches> = NamedZBatches$;
