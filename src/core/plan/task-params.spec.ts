import { beforeEach, describe, expect, it } from '@jest/globals';
import { ZTaskParams } from './task-params.js';

describe('ZTaskParams', () => {
  let initial: ZTaskParams.Values;
  let mutable: ZTaskParams.Mutable;

  beforeEach(() => {
    initial = {
      attrs: { attr: ['val'] },
      args: ['arg1'],
    };
    mutable = {
      attrs: {},
      args: [],
    };
    ZTaskParams.update(mutable, initial);
  });

  describe('update', () => {
    it('appends attributes', () => {
      ZTaskParams.update(mutable, { attrs: { attr: ['val2'] } });
      expect(mutable).toEqual({
        ...initial,
        attrs: { attr: ['val', 'val2'] },
      });
    });
    it('ignores undefined attribute values', () => {
      ZTaskParams.update(mutable, { attrs: { attr: undefined } });
      expect(mutable).toEqual(initial);
    });
    it('appends arguments', () => {
      ZTaskParams.update(mutable, { args: ['arg2'] });
      expect(mutable).toEqual({
        ...initial,
        args: ['arg1', 'arg2'],
      });
    });
  });

  describe('attr', () => {
    it('returns `undefined` for absent attribute', () => {
      const params = new ZTaskParams(initial);

      expect(params.attr('absent')).toBeUndefined();
    });
    it('returns `undefined` for removed attribute', () => {
      const params = new ZTaskParams({ ...initial, attrs: { removed: null } });

      expect(params.attr('removed')).toBeUndefined();
    });
    it('returns the only attribute value', () => {
      const params = new ZTaskParams(initial);

      expect(params.attr('attr')).toBe('val');
    });
    it('returns the the last attribute value', () => {
      const params = new ZTaskParams(
        ZTaskParams.update(mutable, { attrs: { attr: ['val2', 'val3'] } }),
      );

      expect(params.attr('attr')).toBe('val3');
    });
  });

  describe('flag', () => {
    it('returns `false` for absent flag', () => {
      const params = new ZTaskParams(initial);

      expect(params.flag('absent')).toBe(false);
    });
    it('returns `true` for present flag', () => {
      const params = new ZTaskParams(initial);

      expect(params.flag('attr')).toBe(true);
    });
    it('returns `true` for flag with empty value', () => {
      const params = new ZTaskParams(ZTaskParams.update(mutable, { attrs: { attr2: [''] } }));

      expect(params.flag('attr2')).toBe(true);
    });
    it('returns `false` for flag with `0` value', () => {
      const params = new ZTaskParams(ZTaskParams.update(mutable, { attrs: { flag: ['1', '0'] } }));

      expect(params.flag('flag')).toBe(false);
    });
    it('returns `false` for flag with `false` value', () => {
      const params = new ZTaskParams(
        ZTaskParams.update(mutable, { attrs: { flag: ['true', 'false'] } }),
      );

      expect(params.flag('flag')).toBe(false);
    });
    it('returns `false` for flag with `False` value', () => {
      const params = new ZTaskParams(
        ZTaskParams.update(mutable, { attrs: { flag: ['true', 'False'] } }),
      );

      expect(params.flag('flag')).toBe(false);
    });
    it('returns `false` for flag with `off` value', () => {
      const params = new ZTaskParams(
        ZTaskParams.update(mutable, { attrs: { flag: ['on', 'off'] } }),
      );

      expect(params.flag('flag')).toBe(false);
    });
    it('returns `false` for flag with `OFF` value', () => {
      const params = new ZTaskParams(
        ZTaskParams.update(mutable, { attrs: { flag: ['on', 'OFF'] } }),
      );

      expect(params.flag('flag')).toBe(false);
    });
  });
});
