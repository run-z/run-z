import { beforeEach, describe, expect, it } from '@jest/globals';
import { StandardZSetup } from '../../builtins';
import type { ZPackage } from './package';
import type { ZPackageResolver } from './package-resolver';
import type { ZPackageSet } from './package-set';
import { ZPackageTree } from './package-tree';

describe('ZPackage', () => {
  let resolver: ZPackageResolver;
  let tree: ZPackageTree;
  let pkg: ZPackage;

  beforeEach(async () => {
    tree = new ZPackageTree('test', {
      packageJson: {
        scripts: {
          task1: 'run-z --then exec1',
          task2: 'run-z task1 --then exec2',
        },
      },
    });
    resolver = new StandardZSetup({}).packageResolver;
    pkg = await resolver.get(tree);
  });

  describe('tasks', () => {
    it('contains tasks', async () => {
      const task1 = await pkg.task('task1');
      const task2 = await pkg.task('task2');

      expect(task1.spec.action?.command).toBe('exec1');
      expect(task2.spec.action?.command).toBe('exec2');
    });
  });

  describe('packages', () => {
    it('contains the package itself', () => {
      expect([...pkg.packages()]).toEqual([pkg]);
    });
  });

  describe('select', () => {
    it('selects packages', async () => {
      tree.put('nested', { packageJson: { name: 'nested' } });
      expect(await select('.///')).toEqual(['test', 'nested']);
    });
    it('excludes packages without `package.json`', async () => {
      tree.put('nested');
      expect(await select('.///')).toEqual(['test']);
    });
  });

  describe('andPackages', () => {
    it('combines packages', async () => {
      const nested = await resolver.get(tree.put('nested', { packageJson: { name: 'nested' } }));

      expect(await packages(pkg.andPackages(nested))).toEqual(['test', 'nested']);
    });
    it('combines package sets', async () => {
      const nested = await resolver.get(tree.put('nested', { packageJson: { name: 'nested' } }));
      const nested2 = await resolver.get(tree.put('nested2', { packageJson: { name: 'nested2' } }));

      expect(await packages(pkg.andPackages(nested).andPackages(nested2))).toEqual([
        'test',
        'nested',
        'nested2',
      ]);
    });
  });

  async function packages(packageSet: ZPackageSet): Promise<string[]> {
    return (await packageSet.packages()).map(({ name }) => name);
  }

  async function select(selector: string): Promise<string[]> {
    return packages(pkg.select(selector));
  }
});
