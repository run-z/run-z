import { ZCallDetails, ZSetup, ZShell } from '../core';
import { ZPackage, ZPackageJson, ZPackageTree } from '../core/packages';
import type { ZCall } from '../core/plan';

export class TestPlan {

  readonly setup: ZSetup;
  readonly root: ZPackageTree;
  private _target: ZPackageTree;

  constructor(
      name = 'root',
      {
        packageJson = {},
        shell,
      }: {
        packageJson?: ZPackageJson;
        shell?: ZShell,
      } = {},
  ) {
    this.setup = new ZSetup();
    this._target = this.root = new ZPackageTree(name, { packageJson, shell });
  }

  target(location: ZPackageTree = this._target): Promise<ZPackage> {
    this._target = location;
    return this.setup.packageResolver.get(location);
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

  async call(taskName: string, details?: ZCallDetails): Promise<ZCall> {

    const target = await this.target();
    const task = await target.task(taskName);

    return task.call(details);
  }

}
