import { ZPackage, ZPackageJson, ZPackageTree } from '../core/packages';
import type { ZCall, ZCallInstruction } from '../core/plan';
import { ZSetup } from '../core/setup';

export class TestPlan {

  readonly setup: ZSetup;
  readonly root: ZPackageTree;
  private _target: ZPackageTree;

  constructor(name = 'root', packageJson?: ZPackageJson) {
    this.setup = new ZSetup();
    this._target = this.root = new ZPackageTree(name, packageJson);
  }

  target(location: ZPackageTree = this._target): Promise<ZPackage> {
    this._target = location;
    return this.setup.packageResolver.get(location);
  }

  addPackage(name: string, packageJson?: ZPackageJson): ZPackageTree {
    return this._target = this.root.put(name, packageJson);
  }

  async plan(taskName: string, instruction: Omit<ZCallInstruction, 'task'> = {}): Promise<ZCall> {

    const target = await this.target();
    const task = target.task(taskName);

    return this.setup.planner.plan({ ...instruction, task });
  }

}
