import type { WeatherSnapshot } from '../types';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

const WMO: Record<number, string> = {
  0: '晴',
  1: '大部晴朗',
  2: '多云',
  3: '阴',
  45: '雾',
  48: '雾凇',
  51: '小毛毛雨',
  53: '毛毛雨',
  55: '大毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  80: '阵雨',
  81: '强阵雨',
  95: '雷阵雨',
};

export function weatherLabel(code: number): string {
  return WMO[code] ?? `天气代码 ${code}`;
}

export function windDirLabel(deg: number): string {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  return dirs[Math.round(deg / 45) % 8] + '风';
}

/** 中国气象风力等级（按 10 米风速 km/h 近似）。 */
export function windScaleLabel(kmh: number): string {
  const n =
    kmh < 1 ? 0 : kmh < 6 ? 1 : kmh < 12 ? 2 : kmh < 20 ? 3 : kmh < 29 ? 4 : kmh < 39 ? 5 : kmh < 50 ? 6 : 7;
  return `${n}级`;
}

/** 首页天气条一行四格，避免间隔号长句折行。 */
export function weatherBarMeta(weather: WeatherSnapshot): string[] {
  return [
    weatherLabel(weather.weatherCode),
    `${windDirLabel(weather.windDirDeg)} ${windScaleLabel(weather.windKmh)}`,
    `${weather.humidityPct.toFixed(0)}%`,
    `${weather.pressureHpa.toFixed(0)}hPa`,
  ];
}

type OpenMeteoResponse = {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    cloud_cover: number;
  };
  hourly: {
    time: string[];
    pressure_msl: number[];
  };
};

function pressureThreeHoursAgo(hourly: OpenMeteoResponse['hourly'], currentIso: string, currentHpa: number): number {
  const current = new Date(currentIso).getTime();
  const target = current - 3 * 60 * 60 * 1000;
  let best = currentHpa;
  let bestDiff = Infinity;
  hourly.time.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - target);
    if (diff < bestDiff && hourly.pressure_msl[i] != null) {
      bestDiff = diff;
      best = hourly.pressure_msl[i];
    }
  });
  return currentHpa - best;
}

export async function fetchWeather(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'Asia/Shanghai',
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'pressure_msl',
      'wind_speed_10m',
      'wind_direction_10m',
      'cloud_cover',
    ].join(','),
    hourly: 'pressure_msl',
    past_hours: '6',
    forecast_hours: '1',
  });

  const res = await fetch(`${OPEN_METEO}?${params}`, { signal });
  if (!res.ok) throw new Error(`天气接口失败 ${res.status}`);
  const data = (await res.json()) as OpenMeteoResponse;
  const c = data.current;
  return {
    at: c.time,
    lat,
    lon,
    temperatureC: c.temperature_2m,
    apparentC: c.apparent_temperature,
    humidityPct: c.relative_humidity_2m,
    pressureHpa: c.pressure_msl,
    pressureDelta3h: pressureThreeHoursAgo(data.hourly, c.time, c.pressure_msl),
    windKmh: c.wind_speed_10m,
    windDirDeg: c.wind_direction_10m,
    precipitationMm: c.precipitation,
    weatherCode: c.weather_code,
    cloudPct: c.cloud_cover,
  };
}
