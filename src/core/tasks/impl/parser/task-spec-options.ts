import { arrayOfElements, valueByRecipe } from '@proc7ts/primitives';
import type { SupportedZOptions } from '@run-z/optionz';
import type { ZTaskOption } from '../../task-option';
import type { ZTaskParser } from '../../task-parser';
import type { DraftZTask } from './draft-task';

/**
 * @internal
 */
const defaultZTaskSpecOptions: SupportedZOptions.Map<ZTaskOption> = {

    '--and': readZTaskCommand.bind(undefined, true),
    '--then': readZTaskCommand.bind(undefined, false),

    '--*=*': readNameValueZTaskArg,
    '-*=*': readNameValueZTaskArg,

    '--*': readNamedZTaskArg,
    '-*': readNamedZTaskArg,

    './*'(option: ZTaskOption): void {
        option.pre.nextTarget({ selector: option.name });
        option.values(0);
    },

    '*=*'(option: ZTaskOption): void {

        const { name, taskTarget: { setup: { taskParser } } } = option;

        if (taskParser.parseAttr(name, (n, v) => !n.includes('/') && !!option.addAttr(n, v))) {
            option.values(0);
        }
    },

    '/*'(option: ZTaskOption): void {

        const { name } = option;
        const preOption = name.substr(1);

        if (preOption) {
            option.pre.addOption(preOption);
        }
        option.values(0);
    },

    '//*'(option: ZTaskOption): void {
        option.values().slice(0, -1).forEach(preOption => option.pre.addOption(preOption));
    },

    ','(option: ZTaskOption): void {
        option.pre.parallelToNext();
        option.values(0);
    },

    '*'(option: ZTaskOption): void {

        const { name } = option;

        if (name) {
            option.pre.start(name);
        }
        option.values(0);
    },

};

/**
 * @internal
 */
export function zTaskSpecOptions(
    options: ZTaskParser.SupportedOptions = [],
): SupportedZOptions<ZTaskOption, DraftZTask> {

    const providers: SupportedZOptions.Provider<ZTaskOption, DraftZTask>[] = arrayOfElements(options)
        .map(o => ({ builder }) => valueByRecipe(o, builder));

    return [defaultZTaskSpecOptions, ...providers];
}

/**
 * @internal
 */
function readNamedZTaskArg(option: ZTaskOption): void {
    if (option.pre.isStarted) {
        option.pre.addArg(option.name);
    } else {
        option.addArg(option.name);
    }
    option.values(0);
}

/**
 * @internal
 */
function readNameValueZTaskArg(option: ZTaskOption): void {

    const [value] = option.values(1);
    const arg = `${option.name}=${value}`;

    if (option.pre.isStarted) {
        option.pre.addArg(arg);
    } else {
        option.addArg(arg);
    }
}

/**
 * @internal
 */
function readZTaskCommand(parallel: boolean, option: ZTaskOption): void {

    const [command, ...args] = option.rest();

    if (command) {
        option.setAction({
            type: 'command',
            command,
            parallel,
            args,
        });
    }
}
