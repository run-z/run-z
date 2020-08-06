import { asis } from '@proc7ts/primitives';
import { StandardZSetup } from '../builtins';
import type { ZCallDetails, ZPackageLocation, ZPlan, ZSetup, ZShell } from '../core';
import { ZPackage, ZPackageJson, ZPackageTree } from '../core/packages';
import type { ZCall } from '../core/plan';

export class TestPlan {

  readonly setup: ZSetup;
  readonly root: ZPackageTree;
  lastCall!: ZCall;
  private _target: ZPackageLocation;

  constructor(
      name = 'root',
      {
        setup = new StandardZSetup(),
        packageJson = {},
        shell,
      }: {
        setup?: ZSetup;
        packageJson?: ZPackageJson;
        shell?: ZShell;
      } = {},
  ) {
    this.setup = setup;
    this._target = this.root = new ZPackageTree(name, { packageJson, shell });
  }

  get lastPlan(): ZPlan {
    return this.lastCall.plan;
  }

  target(location: ZPackageLocation = this._target): Promise<ZPackage> {

    const target = this.setup.packageResolver.get(location);

    this._target = location;

    return target;
  }

  addPackage(
      name: string,
      {
        packageJson,
        shell,
      }: {
        packageJson?: ZPackageJson;
        shell?: ZShell;
      } = {},
  ): ZPackageTree {
    return this._target = this.root.put(name, { packageJson, shell });
  }

  async parse(commandLine: string): Promise<ZCall> {

    const target = await this.target();
    const builder = this.setup.taskFactory.newTask(target, '');

    await builder.parse(commandLine);

    return this.lastCall = await builder.task().call();
  }

  async call(taskName: string, details?: ZCallDetails): Promise<ZCall> {

    const target = await this.target();
    const task = await target.task(taskName);

    return this.lastCall = await task.call(details);
  }

  async callOf(target: ZPackage, taskName: string): Promise<ZCall> {
    return this.lastPlan.callOf(await target.task(taskName));
  }

  noCallOf(target: ZPackage, taskName: string): Promise<any> {
    return this.callOf(target, taskName).catch(asis);
  }

}
