import type { ZCall, ZJob, ZPackage, ZTask } from '../../core';
import type { ZJobProgress } from './job-progress';
import type { ZProgressFormat } from './progress-format';
import { RichZProgressFormat } from './rich-progress-format';

describe('ZProgressFormat', () => {

  let format: ZProgressFormat;

  beforeEach(() => {
    format = new RichZProgressFormat();
  });

  describe('register', () => {
    it('selects longest prefix', async () => {

      const jp1 = jobProgress('long-target', 'long-task');

      format.register(jp1);
      expect(format.targetCols).toBe(11);
      expect(format.taskCols).toBe(9);
      await whenRendered();

      expect(jp1.render).toHaveBeenCalled();

      const jp2 = jobProgress('target', 'task');

      format.register(jp2);
      expect(format.targetCols).toBe(11);
      expect(format.taskCols).toBe(9);
      await whenRendered();

      expect(jp2.render).not.toHaveBeenCalled();

      const jp3 = jobProgress('very-long-target', 'very-long-task');

      format.register(jp3);
      expect(format.targetCols).toBe(16);
      expect(format.taskCols).toBe(14);
      await whenRendered();

      expect(jp3.render).toHaveBeenCalled();
    });
  });

  function jobProgress(target: string, name: string): jest.Mocked<ZJobProgress & { render: () => Promise<void> }> {

    const job = {
      call: {
        task: {
          name,
          target: {
            name: target,
          } as ZPackage,
        } as ZTask,
      } as ZCall,
    } as ZJob;

    return {
      job,
      render: jest.fn(),
    } as any;
  }

  function whenRendered(): Promise<void> {
    return format.schedule.schedule(() => Promise.resolve());
  }

});
