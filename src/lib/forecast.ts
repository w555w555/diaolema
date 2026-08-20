import type { WeatherSnapshot } from '../types';
import { buildFishingIndex } from './fishingIndex';

export type HourlyForecast = {
  at: string;
  temperatureC: number;
  weatherCode: number;
  precipitationMm: number;
  windKmh: number;
  pressureHpa: number;
  humidityPct: number;
};

export type DailyForecast = {
  date: string;
  weatherCode: number;
  tempMaxC: number;
  tempMinC: number;
  precipitationMm: number;
  windKmh: number;
  windDirDeg: number;
  pressureHpa: number;
  humidityPct: number;
};

export type OpenMeteoHourly = {
  time: string[];
  temperature_2m?: number[];
  weather_code?: number[];
  precipitation?: number[];
  wind_speed_10m?: number[];
  wind_direction_10m?: number[];
  pressure_msl?: number[];
  relative_humidity_2m?: number[];
};

export type OpenMeteoDaily = {
  time: string[];
  weather_code?: number[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_sum?: number[];
  wind_speed_10m_max?: number[];
  wind_direction_10m_dominant?: number[];
  pressure_msl_mean?: number[];
  relative_humidity_2m_mean?: number[];
};

function num(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function mapHourlyForecast(hourly: OpenMeteoHourly): HourlyForecast[] {
  return (hourly.time ?? []).map((at, i) => ({
    at,
    temperatureC: num(hourly.temperature_2m?.[i]),
    weatherCode: num(hourly.weather_code?.[i]),
    precipitationMm: num(hourly.precipitation?.[i]),
    windKmh: num(hourly.wind_speed_10m?.[i]),
    pressureHpa: num(hourly.pressure_msl?.[i], 1013.25),
    humidityPct: num(hourly.relative_humidity_2m?.[i], 70),
  }));
}

export function mapDailyForecast(daily: OpenMeteoDaily): DailyForecast[] {
  return (daily.time ?? []).map((date, i) => ({
    date,
    weatherCode: num(daily.weather_code?.[i]),
    tempMaxC: num(daily.temperature_2m_max?.[i]),
    tempMinC: num(daily.temperature_2m_min?.[i]),
    precipitationMm: num(daily.precipitation_sum?.[i]),
    windKmh: num(daily.wind_speed_10m_max?.[i]),
    windDirDeg: num(daily.wind_direction_10m_dominant?.[i]),
    pressureHpa: num(daily.pressure_msl_mean?.[i], 1013.25),
    humidityPct: num(daily.relative_humidity_2m_mean?.[i], 70),
  }));
}

export function pickUpcomingHours(rows: HourlyForecast[], nowIso: string, count = 24): HourlyForecast[] {
  const now = new Date(nowIso).getTime();
  return rows.filter((row) => new Date(row.at).getTime() >= now - 30 * 60 * 1000).slice(0, count);
}

export function hourLabel(at: string): string {
  const hit = at.match(/T(\d{2})/);
  return hit ? `${Number(hit[1])}时` : at;
}

export function weekdayLabel(date: string, today: string): string {
  if (date === today) return '今天';
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(`${today}T00:00:00+08:00`).getTime();
  const target = new Date(`${date}T00:00:00+08:00`).getTime();
  const diff = Math.round((target - start) / dayMs);
  if (diff === 1) return '明天';
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[new Date(`${date}T12:00:00+08:00`).getDay()] ?? date;
}

export function shanghaiDate(at: Date | string): string {
  const date = typeof at === 'string' ? new Date(at) : at;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(date);
}

export function enrichDailyFromHourly(days: DailyForecast[], hours: HourlyForecast[]): DailyForecast[] {
  return days.map((day) => {
    const rows = hours.filter((row) => row.at.slice(0, 10) === day.date);
    if (!rows.length) return day;
    const pressure = rows.reduce((sum, row) => sum + row.pressureHpa, 0) / rows.length;
    const humidity = rows.reduce((sum, row) => sum + row.humidityPct, 0) / rows.length;
    return { ...day, pressureHpa: pressure, humidityPct: humidity };
  });
}

export function snapshotFromDaily(
  day: DailyForecast,
  loc: { lat: number; lon: number },
): WeatherSnapshot {
  const mid = (day.tempMaxC + day.tempMinC) / 2;
  return {
    at: `${day.date}T12:00:00+08:00`,
    lat: loc.lat,
    lon: loc.lon,
    temperatureC: mid,
    apparentC: mid,
    humidityPct: day.humidityPct,
    pressureHpa: day.pressureHpa,
    pressureDelta3h: 0,
    windKmh: day.windKmh,
    windDirDeg: day.windDirDeg,
    precipitationMm: day.precipitationMm,
    weatherCode: day.weatherCode,
    cloudPct: 0,
  };
}

export function dailyFishingIndex(day: DailyForecast, loc: { lat: number; lon: number }) {
  return buildFishingIndex(snapshotFromDaily(day, loc), new Date(`${day.date}T12:00:00+08:00`));
}
