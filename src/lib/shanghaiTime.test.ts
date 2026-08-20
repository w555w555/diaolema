import { describe, expect, it } from 'vitest';
import { parseShanghaiClock, shanghaiHour, shanghaiMonth, shanghaiWallDate } from './shanghaiTime';

describe('shanghaiTime', () => {
  it('东八区 06:00 的小时是 6，不跟 UTC 机器本地时区', () => {
    expect(shanghaiHour(new Date('2026-08-17T06:00:00+08:00'))).toBe(6);
    expect(shanghaiHour(new Date('2026-08-16T22:00:00Z'))).toBe(6);
    expect(shanghaiMonth(new Date('2026-08-17T06:00:00+08:00'))).toBe(8);
  });

  it('按上海日历拼出晨窗起点', () => {
    const at = new Date('2026-08-17T06:00:00+08:00');
    expect(shanghaiWallDate(at, 5).toISOString()).toBe('2026-08-16T21:00:00.000Z');
    expect(shanghaiWallDate(at, 8).getTime() - at.getTime()).toBe(2 * 60 * 60 * 1000);
  });

  it('无时区预报串按东八区读', () => {
    expect(parseShanghaiClock('2026-08-20T14:00')).toBe(new Date('2026-08-20T14:00:00+08:00').getTime());
    expect(parseShanghaiClock('2026-08-20T14:10:00+08:00')).toBe(new Date('2026-08-20T14:10:00+08:00').getTime());
  });
});
