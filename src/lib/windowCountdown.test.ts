import { describe, expect, it } from 'vitest';
import { windowCountdown } from './windowCountdown';

describe('windowCountdown', () => {
  it('06:00 在晨窗内，倒计时到 08:00', () => {
    const c = windowCountdown(new Date('2026-08-17T06:00:00+08:00'));
    expect(c.phase).toBe('in');
    expect(c.name).toBe('晨间窗口');
    expect(c.title).toBe('晨间窗口剩余');
    expect(c.remainText).toBe('02:00:00');
  });

  it('12:00 窗外，倒计时到昏窗 17:00', () => {
    const c = windowCountdown(new Date('2026-08-17T12:00:00+08:00'));
    expect(c.phase).toBe('wait');
    expect(c.name).toBe('黄昏窗口');
    expect(c.title).toBe('距黄昏窗口');
    expect(c.remainText).toBe('05:00:00');
  });

  it('17:30 在昏窗内，倒计时到 20:00', () => {
    const c = windowCountdown(new Date('2026-08-17T17:30:00+08:00'));
    expect(c.phase).toBe('in');
    expect(c.name).toBe('黄昏窗口');
    expect(c.title).toBe('黄昏窗口剩余');
    expect(c.remainText).toBe('02:30:00');
  });

  it('21:00 倒计时到次日晨窗 05:00', () => {
    const c = windowCountdown(new Date('2026-08-17T21:00:00+08:00'));
    expect(c.phase).toBe('wait');
    expect(c.name).toBe('晨间窗口');
    expect(c.title).toBe('距晨间窗口');
    expect(c.remainText).toBe('08:00:00');
  });

  it('04:00 倒计时到当日晨窗', () => {
    const c = windowCountdown(new Date('2026-08-17T04:00:00+08:00'));
    expect(c.phase).toBe('wait');
    expect(c.title).toBe('距晨间窗口');
    expect(c.remainText).toBe('01:00:00');
  });
});
