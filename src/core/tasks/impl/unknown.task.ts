import type { ZPackage } from '../../packages';
import { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class UnknownZTask extends AbstractZTask<ZTaskSpec.Unknown> {

    constructor(target: ZPackage, name: string) {
        super(target, name, ZTaskSpec.unknown);
    }

}
