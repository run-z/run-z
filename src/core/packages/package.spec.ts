import { ZSetup } from '../setup';
import type { ZPackage } from './package';
import type { ZPackageResolver } from './package-resolver';
import { ZPackageTree } from './package-tree';

describe('ZPackage', () => {

  let resolver: ZPackageResolver;
  let tree: ZPackageTree;
  let pkg: ZPackage;

  beforeEach(async () => {
    tree = new ZPackageTree(
        'test',
        {
          scripts: {
            task1: 'run-z --then exec1',
            task2: 'run-z task1 --then exec2',
          },
        },
    );
    resolver = new ZSetup({ currentLocation: tree }).packageResolver;
    pkg = await resolver.get(tree);
  });

  describe('tasks', () => {
    it('contains tasks', () => {
      expect(pkg.task('task1').spec.action?.command).toBe('exec1');
      expect(pkg.task('task2').spec.action?.command).toBe('exec2');
    });
  });

  describe('packages', () => {
    it('contains the package itself', () => {
      expect(Array.from(pkg.packages())).toEqual([pkg]);
    });
  });

  describe('select', () => {
    it('selects packages', async () => {
      tree.put('nested', { name: 'nested' });
      expect(await select('.///')).toEqual(['test', 'nested']);
    });
    it('excludes packages without `package.json`', async () => {
      tree.put('nested');
      expect(await select('.///')).toEqual(['test']);
    });
  });

  async function select(pattern: string): Promise<string[]> {

    const result: string[] = [];

    for await (const resolved of pkg.select(pattern).packages()) {
      result.push(resolved.name);
    }

    return result;
  }
});
