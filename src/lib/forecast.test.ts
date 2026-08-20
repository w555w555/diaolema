import { describe, expect, it } from 'vitest';
import {
  dailyFishingIndex,
  hourLabel,
  mapDailyForecast,
  mapHourlyForecast,
  pickUpcomingHours,
  shanghaiDate,
  snapshotFromDaily,
  weekdayLabel,
} from './forecast';

const hourly = mapHourlyForecast({
  time: ['2026-08-20T13:00', '2026-08-20T14:00', '2026-08-20T15:00', '2026-08-21T13:00'],
  temperature_2m: [31, 32, 30, 28],
  weather_code: [2, 61, 3, 0],
  precipitation: [0, 1.2, 0, 0],
  wind_speed_10m: [12, 18, 10, 8],
});

const daily = mapDailyForecast({
  time: ['2026-08-20', '2026-08-21', '2026-08-22'],
  weather_code: [61, 0, 95],
  temperature_2m_max: [33, 29, 27],
  temperature_2m_min: [25, 22, 21],
  precipitation_sum: [4, 0, 12],
  wind_speed_10m_max: [18, 10, 32],
  wind_direction_10m_dominant: [90, 180, 45],
  pressure_msl_mean: [1006, 1018, 1024],
  relative_humidity_2m_mean: [78, 62, 88],
});

describe('mapHourlyForecast', () => {
  it('按小时抽出气温降水风', () => {
    expect(hourly[1]).toMatchObject({ at: '2026-08-20T14:00', temperatureC: 32, precipitationMm: 1.2, weatherCode: 61 });
  });
});

describe('pickUpcomingHours', () => {
  it('从当前时刻起取 24 条以内', () => {
    const next = pickUpcomingHours(hourly, '2026-08-20T14:10:00+08:00', 24);
    expect(next[0].at).toBe('2026-08-20T14:00');
    expect(next).toHaveLength(3);
  });
});

describe('hourLabel / weekdayLabel', () => {
  it('写成 14时 与 今天/明天/周几', () => {
    expect(hourLabel('2026-08-20T14:00')).toBe('14时');
    expect(weekdayLabel('2026-08-20', '2026-08-20')).toBe('今天');
    expect(weekdayLabel('2026-08-21', '2026-08-20')).toBe('明天');
    expect(weekdayLabel('2026-08-22', '2026-08-20')).toBe('周六');
  });
});

describe('snapshotFromDaily', () => {
  it('用日均气温且气压变化为 0，不编造水温', () => {
    const snap = snapshotFromDaily(daily[0], { lat: 31.23, lon: 121.47 });
    expect(snap.temperatureC).toBe(29);
    expect(snap.pressureDelta3h).toBe(0);
    expect(snap.precipitationMm).toBe(4);
    expect(snap).not.toHaveProperty('waterTemp');
  });
});

describe('dailyFishingIndex', () => {
  it('雷暴大风日档位偏低或不宜', () => {
    const storm = dailyFishingIndex(daily[2], { lat: 31.23, lon: 121.47 });
    expect(['偏低', '不宜']).toContain(storm.label);
  });
});

describe('shanghaiDate', () => {
  it('按东八区取日期', () => {
    expect(shanghaiDate('2026-08-20T01:00:00+08:00')).toBe('2026-08-20');
  });
});
