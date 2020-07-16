import { TestPlan } from '../../../spec';
import { ScriptZTask } from './script.task';

describe('ScriptZTask', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  it('does not contain any parameters', async () => {
    testPlan.addPackage('test', { scripts: { test: 'exec --arg' } });

    const call = await testPlan.plan('test');

    expect(call.task).toBeInstanceOf(ScriptZTask);

    const params = call.params();

    expect(params.attrs).toEqual({});
    expect(params.args).toHaveLength(0);
    expect(params.actionArgs).toHaveLength(0);
  });
});
