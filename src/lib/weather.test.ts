import { describe, expect, it } from 'vitest';
import { weatherBarMeta, windDirLabel, windScaleLabel } from './weather';
import type { WeatherSnapshot } from '../types';

describe('windScaleLabel', () => {
  it('把 km/h 收成中国气象几级', () => {
    expect(windScaleLabel(0)).toBe('0级');
    expect(windScaleLabel(8)).toBe('2级');
    expect(windScaleLabel(15)).toBe('3级');
  });
});

describe('windDirLabel', () => {
  it('东南风', () => {
    expect(windDirLabel(135)).toBe('东南风');
  });
});

describe('weatherBarMeta', () => {
  it('输出现象、风向风力、湿度、气压四格', () => {
    const weather: WeatherSnapshot = {
      at: '2026-08-19T08:00:00+08:00',
      lat: 31.23,
      lon: 121.47,
      temperatureC: 28,
      apparentC: 30,
      humidityPct: 65.4,
      pressureHpa: 1012.6,
      pressureDelta3h: -0.4,
      windKmh: 15,
      windDirDeg: 45,
      precipitationMm: 0,
      weatherCode: 2,
      cloudPct: 40,
    };
    expect(weatherBarMeta(weather)).toEqual(['多云', '东北风 3级', '65%', '1013hPa']);
  });
});
