import type { ZPackage } from './package';
import { ZPackageResolver } from './package-resolver';
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
    resolver = new ZPackageResolver(tree);
    pkg = await resolver.get(tree);
  });

  describe('tasks', () => {
    it('contains tasks', () => {
      expect(pkg.tasks.size).toBe(2);
      expect(pkg.tasks.get('task1')?.name).toBe('task1');
      expect(pkg.tasks.get('task2')?.name).toBe('task2');
    });
  });

  describe('packages', () => {
    it('contains the package itself', () => {
      expect(Array.from(pkg.packages())).toEqual([pkg]);
    });
  });

  describe('resolve', () => {
    it('resolves packages', async () => {
      tree.put('nested', { name: 'nested' });
      expect(await resolve('.///')).toEqual(['test', 'nested']);
    });
    it('excludes packages without `package.json`', async () => {
      tree.put('nested');
      expect(await resolve('.///')).toEqual(['test']);
    });
  });

  async function resolve(pattern: string): Promise<string[]> {

    const result: string[] = [];

    for await (const resolved of pkg.resolve(pattern).packages()) {
      result.push(resolved.name);
    }

    return result;
  }
});
