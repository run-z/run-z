import { ZRenderSchedule } from './render-schedule';

describe('ZRenderSchedule', () => {

  let schedule: ZRenderSchedule;

  beforeEach(() => {
    schedule = new ZRenderSchedule();
  });

  it('schedules render', async () => {

    const action = jest.fn(() => Promise.resolve());
    const scheduled = schedule.schedule(action);

    await scheduled;

    expect(action).toHaveBeenCalledTimes(1);
  });
  it('schedules subsequent renders', async () => {

    const render1 = jest.fn(() => Promise.resolve());
    const render2 = jest.fn(() => Promise.resolve());
    const scheduled1 = schedule.schedule(render1);
    const scheduled2 = schedule.schedule(render2);

    expect(scheduled1).toBe(scheduled2);

    await scheduled1;

    expect(render1).toHaveBeenCalledTimes(1);
    expect(render2).toHaveBeenCalledTimes(1);
  });
});
