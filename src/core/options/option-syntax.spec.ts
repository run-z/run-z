import type { ZOptionInput } from './option-input';
import { ZOptionSyntax } from './option-syntax';

describe('ZOptionSyntax', () => {
  describe('by', () => {
    it('returns the same syntax instance', () => {
      expect(ZOptionSyntax.by(ZOptionSyntax.shortOptions)).toBe(ZOptionSyntax.shortOptions);
    });
    it('combines syntax', () => {

      const input1: ZOptionInput = { name: '1' };
      const syntax1: ZOptionSyntax = () => [input1];
      const input2: ZOptionInput = { name: '2' };
      const syntax2:ZOptionSyntax = () => [input2];
      const combined = ZOptionSyntax.by([syntax1, syntax2]);

      expect([...combined(['foo', 'bar'])]).toEqual([input1, input2]);
    });
    it('de-duplicates option inputs', () => {

      const input1: ZOptionInput = { name: '1' };
      const input2: ZOptionInput = { name: '2' };
      const input3: ZOptionInput = { name: '3' };

      const syntax1: ZOptionSyntax = () => [input1, input2];
      const syntax2:ZOptionSyntax = () => [input2, input3];
      const combined = ZOptionSyntax.by([syntax1, syntax2]);

      expect([...combined(['foo', 'bar'])]).toEqual([input1, input2, input3]);
    });
  });
});
