/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZOption } from './option';
import type { ZOptionSyntax } from './option-syntax';
import type { SupportedZOptions } from './supported-options';

/**
 * Command line options parser configuration.
 *
 * @typeparam TCtx  Option processing context required by parser.
 * @typeparam TOption  A type of option representation.
 */
export interface ZOptionsConfig<TCtx, TOption extends ZOption> {

    /**
     * Supported command line options.
     */
    readonly options: SupportedZOptions<TCtx, TOption>;

    /**
     * Supported command line syntax.
     *
     * @default {@link ZOptionSyntax.default}
     */
    readonly syntax?: ZOptionSyntax | readonly ZOptionSyntax[];

    /**
     * Builds command line option representation class.
     *
     * @param base  Base option representation class.
     *
     * @returns Command line option representation class constructor.
     */
    optionClass<TArgs extends any[]>(
        base: ZOption.BaseClass<TArgs>,
    ): ZOption.ImplClass<TOption, TCtx, TArgs>;

}
