import { describe, expect, it } from 'vitest';
import { climateFlags, planFlavor, planForm, planLure, planLureNote, planSpot, planWindow } from './plan';
import type { WeatherSnapshot } from '../types';

function snap(partial: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    at: '2026-08-17T12:00:00+08:00',
    lat: 31.23,
    lon: 121.47,
    temperatureC: 26,
    apparentC: 27,
    humidityPct: 70,
    pressureHpa: 1015,
    pressureDelta3h: 0.2,
    windKmh: 10,
    windDirDeg: 90,
    precipitationMm: 0,
    weatherCode: 1,
    cloudPct: 40,
    ...partial,
  };
}

const noon = new Date('2026-08-17T12:00:00+08:00');
const dawn = new Date('2026-08-17T06:00:00+08:00');
const winter = new Date('2026-01-10T09:00:00+08:00');

describe('planFlavor / planForm', () => {
  it('盛夏正午用本味清淡', () => {
    const flags = climateFlags(snap({ temperatureC: 33 }), noon);
    expect(planFlavor(flags)).toBe('本味清淡');
  });

  it('低温用大腥', () => {
    const flags = climateFlags(snap({ temperatureC: 8 }), winter);
    expect(planFlavor(flags)).toBe('大腥');
  });

  it('鲫鱼台钓偏拉饵，鲤鱼偏搓饵', () => {
    const flags = climateFlags(snap({ temperatureC: 22 }), dawn);
    expect(planForm('鲫鱼', flags, '台钓')).toBe('拉饵');
    expect(planForm('鲤鱼', flags, '台钓')).toBe('搓饵');
  });

  it('低压或气压走低且本味清淡改果酸', () => {
    const falling = climateFlags(snap({ temperatureC: 33, pressureDelta3h: -2 }), noon);
    expect(planFlavor(falling)).toBe('清淡带果酸');
    const low = climateFlags(snap({ temperatureC: 31, pressureHpa: 1005 }), noon);
    expect(planFlavor(low)).toBe('清淡带果酸');
  });

  it('窗口按国内气压口径', () => {
    expect(planWindow(climateFlags(snap({ pressureDelta3h: -2 }), dawn))).toBe('气压走低口差');
    expect(planWindow(climateFlags(snap({ pressureDelta3h: 2 }), dawn))).toBe('气压回升窗口');
    expect(planWindow(climateFlags(snap({ pressureHpa: 1024, pressureDelta3h: 0.1 }), noon))).toBe(
      '高压宜守底',
    );
  });
});

describe('planSpot', () => {
  it('鲫鱼台钓走草边凹岸，鲤鱼走凸岸', () => {
    const flags = climateFlags(snap({ temperatureC: 22 }), noon);
    expect(planSpot('鲫鱼', flags, '台钓')).toBe('草边凹岸');
    expect(planSpot('鲤鱼', flags, '台钓')).toContain('凸岸');
  });

  it('下雨优先进水口缓流', () => {
    const flags = climateFlags(snap({ precipitationMm: 2, weatherCode: 61 }), dawn);
    expect(planSpot('鲫鱼', flags, '台钓')).toMatch(/进水口缓流/);
  });

  it('路亚黑鱼走草洞，翘嘴晨昏走浅滩水草边', () => {
    const dawnFlags = climateFlags(snap({ temperatureC: 24, pressureDelta3h: -2 }), dawn);
    expect(planSpot('黑鱼', dawnFlags, '路亚')).toMatch(/草洞/);
    expect(planSpot('翘嘴', dawnFlags, '路亚')).toBe('近岸浅滩水草边');
    expect(planLure('黑鱼', dawnFlags)).toMatch(/雷蛙/);
    expect(planLure('翘嘴', dawnFlags)).toMatch(/波扒/);
  });
});

describe('planLurePick', () => {
  it('翘嘴夏天白天用 5–7g 斜切亮片', () => {
    const flags = climateFlags(snap({ temperatureC: 26 }), noon);
    expect(planLure('翘嘴', flags)).toMatch(/5–7g/);
    expect(planLure('翘嘴', flags)).toMatch(/斜切亮片/);
    expect(planLureNote('翘嘴', flags)).toMatch(/匀速/);
    expect(planLureNote('翘嘴', flags)).toMatch(/7–12g/);
  });

  it('翘嘴冬春低温用 12–20g 远投', () => {
    const flags = climateFlags(snap({ temperatureC: 8 }), winter);
    expect(planLure('翘嘴', flags)).toMatch(/12–20g/);
  });

  it('黑鱼草区雷蛙，鳜鱼铅头钩，白条瓜子亮片', () => {
    const flags = climateFlags(snap({ temperatureC: 24 }), dawn);
    expect(planLure('黑鱼', flags)).toMatch(/10–14g/);
    expect(planLure('黑鱼', flags)).toMatch(/雷蛙/);
    expect(planLure('鳜鱼', flags)).toMatch(/铅头钩卷尾蛆/);
    expect(planLure('白条', flags)).toMatch(/1\.5–3g/);
    expect(planLure('白条', flags)).toMatch(/瓜子亮片/);
    expect(planLureNote('黑鱼', flags)).toMatch(/停顿/);
  });

  it('下雨改红头或金色，夜钓翘嘴用勺型 7–10g', () => {
    const wet = climateFlags(snap({ precipitationMm: 2, weatherCode: 61, temperatureC: 24 }), noon);
    expect(planLure('翘嘴', wet)).toMatch(/红头|金色/);
    const night = climateFlags(snap({ temperatureC: 22 }), new Date('2026-08-17T21:00:00+08:00'));
    expect(planLure('翘嘴', night)).toMatch(/7–10g/);
    expect(planLure('翘嘴', night)).toMatch(/勺型亮片/);
  });
});
