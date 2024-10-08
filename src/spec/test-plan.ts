import type { ZOptionsParser } from '@run-z/optionz';
import { StandardZSetup } from '../builtins/standard-setup.js';
import { ZPackageLocation } from '../core/packages/package-location.js';
import { ZPackageTree } from '../core/packages/package-tree.js';
import { ZPackage } from '../core/packages/package.js';
import { ZPackageJson } from '../core/packages/package.json.js';
import { ZCallDetails } from '../core/plan/call-details.js';
import { ZCall } from '../core/plan/call.js';
import { ZPlan } from '../core/plan/plan.js';
import { ZSetup } from '../core/setup.js';
import { ZTaskOption } from '../core/tasks/task-option.js';

export class TestPlan {
  readonly setup: ZSetup;
  readonly root: ZPackageTree;
  lastCall!: ZCall;
  #target: ZPackageLocation;

  constructor(
    name = 'root',
    {
      setup = new StandardZSetup(),
      packageJson = {},
    }: {
      setup?: ZSetup | undefined;
      packageJson?: ZPackageJson | undefined;
    } = {},
  ) {
    this.setup = setup;
    this.#target = this.root = new ZPackageTree(name, { packageJson });
  }

  get lastPlan(): ZPlan {
    return this.lastCall.plan;
  }

  target(location: ZPackageLocation = this.#target): Promise<ZPackage> {
    const target = this.setup.packageResolver.get(location);

    this.#target = location;

    return target;
  }

  addPackage(
    name: string,
    {
      packageJson,
    }: {
      packageJson?: ZPackageJson | undefined;
    } = {},
  ): ZPackageTree {
    return (this.#target = this.root.put(name, { packageJson }));
  }

  async parse(commandLine: string, opts?: ZOptionsParser.Opts<ZTaskOption>): Promise<ZCall> {
    const target = await this.target();
    const builder = this.setup.taskFactory.newTask(target, '');

    await builder.parse(commandLine, opts);

    return (this.lastCall = await builder.task().call());
  }

  async call(taskName: string, details?: ZCallDetails): Promise<ZCall> {
    const target = await this.target();
    const task = await target.task(taskName);

    return (this.lastCall = await task.call(details));
  }

  async callOf(target: ZPackage, taskName: string): Promise<ZCall> {
    return this.lastPlan.callOf(await target.task(taskName));
  }

  findCallOf(target: ZPackage, taskName: string): ZCall | undefined {
    return this.lastPlan.findCallOf(target, taskName);
  }
}
