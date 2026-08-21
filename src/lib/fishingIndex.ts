import type { FishingIndex, FishingIndexLabel, WeatherSnapshot } from '../types';
import { shanghaiHour, shanghaiMonth } from './shanghaiTime';
import { applyWaterIndex, type WaterQuery } from './water';
import { windScale, windScaleLabel } from './windScale';

export function indexBand(score: number): FishingIndexLabel {
  if (score >= 80) return '很高';
  if (score >= 65) return '较高';
  if (score >= 50) return '一般';
  if (score >= 35) return '偏低';
  return '不宜';
}

function isStorm(code: number, precip: number): boolean {
  return precip >= 5 || code >= 95 || code === 65 || code === 81;
}

function isLightRain(code: number, precip: number): boolean {
  if (isStorm(code, precip)) return false;
  return precip > 0.2 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
}

export function buildFishingIndex(
  weather: WeatherSnapshot,
  at: Date = new Date(),
  water: WaterQuery = {},
): FishingIndex {
  const month = shanghaiMonth(at);
  const hour = shanghaiHour(at);
  const summer = month >= 6 && month <= 9;
  const hotNoon = summer && weather.temperatureC >= 30 && hour >= 10 && hour <= 16;
  const falling = weather.pressureDelta3h <= -1.5;
  const mildFall = !falling && weather.pressureDelta3h <= -0.5;
  const rising = weather.pressureDelta3h >= 1.5;
  const highStable = weather.pressureHpa >= 1022 && Math.abs(weather.pressureDelta3h) < 1;
  const lowPressure = weather.pressureHpa <= 1005;
  const scale = windScale(weather.windKmh);
  const prime = (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19);
  const storm = isStorm(weather.weatherCode, weather.precipitationMm);
  const lightRain = isLightRain(weather.weatherCode, weather.precipitationMm);

  let score = 62;
  const reasons: string[] = [];

  if (falling) {
    score -= 16;
    reasons.push(`近 3 小时气压下降 ${Math.abs(weather.pressureDelta3h).toFixed(1)} hPa，按国内经验口易变差`);
  } else if (mildFall) {
    score -= 8;
    reasons.push(`气压缓降 ${Math.abs(weather.pressureDelta3h).toFixed(1)} hPa，口可能变轻`);
  } else if (rising) {
    score += 10;
    reasons.push(`气压上升 ${weather.pressureDelta3h.toFixed(1)} hPa，鱼更愿回底层开口`);
  }

  if (highStable) {
    score += 8;
    reasons.push(`高气压 ${weather.pressureHpa.toFixed(0)} hPa 且走势稳，宜守底`);
  } else if (lowPressure) {
    score -= 12;
    reasons.push(`气压 ${weather.pressureHpa.toFixed(0)} hPa 偏低，鱼找氧但口差`);
  }

  if (hotNoon) {
    score -= 18;
    reasons.push(`盛夏正午 ${weather.temperatureC.toFixed(0)}°C，鱼避热下沉`);
  }

  if (weather.temperatureC >= 18 && weather.temperatureC <= 26 && !hotNoon) {
    score += 8;
    reasons.push(`气温 ${weather.temperatureC.toFixed(0)}°C，鱼活性合适`);
  } else if (weather.temperatureC < 8) {
    score -= 18;
    reasons.push(`气温 ${weather.temperatureC.toFixed(0)}°C 过低`);
  } else if (weather.temperatureC >= 35) {
    score -= 14;
    reasons.push(`气温 ${weather.temperatureC.toFixed(0)}°C 过高`);
  }

  if (scale >= 5) {
    score -= 12;
    reasons.push(`${windScaleLabel(weather.windKmh)}风，抛投与找口变难`);
  } else if (summer && scale <= 1) {
    score -= 4;
    reasons.push(`${windScaleLabel(weather.windKmh)}风盛夏水面易闷，优先进水口或下风`);
  }

  if (summer && weather.humidityPct >= 85 && scale <= 2 && !hotNoon) {
    score -= 6;
    reasons.push(`湿度 ${weather.humidityPct.toFixed(0)}%，闷湿口往往更差（不代表溶氧）`);
  }

  if (storm) {
    score -= 30;
    reasons.push('大雨或雷暴，不宜强求出门');
  } else if (lightRain) {
    score += 6;
    reasons.push('有轻降水，进水口附近往往更好开口');
  }

  if (prime && !hotNoon) {
    score += 8;
    reasons.push('正值晨昏窗口');
  }

  const watered = applyWaterIndex(score, reasons, water, { summer, windKmh: weather.windKmh });
  score = watered.score;
  const ranked = watered.reasons;

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (ranked.length < 2) {
    ranked.push(`湿度 ${weather.humidityPct.toFixed(0)}%`);
    ranked.push(`体感 ${weather.apparentC.toFixed(0)}°C`);
  }

  return { score, label: indexBand(score), reasons: ranked.slice(0, 5) };
}

export function outingLabel(label: FishingIndexLabel): string {
  if (label === '很高' || label === '较高') return '适宜出钓';
  if (label === '一般') return '可以出钓';
  if (label === '偏低') return '谨慎出钓';
  return '不宜出钓';
}
