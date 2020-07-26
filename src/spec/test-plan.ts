import { ZSetup, ZShell } from '../core';
import { ZPackage, ZPackageJson, ZPackageTree } from '../core/packages';
import type { ZCall, ZCallInstruction } from '../core/plan';

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

  async plan(taskName: string, instruction: Omit<ZCallInstruction, 'task'> = {}): Promise<ZCall> {

    const target = await this.target();
    const task = await target.task(taskName);

    return this.setup.planner.plan({ ...instruction, task });
  }

}
