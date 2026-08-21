import type { FishingIndex, FishingIndexLabel, WeatherSnapshot } from '../types';

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

/** 出钓适宜度：只评出门条件。气压/ΔP 不计分。 */
export function buildFishingIndex(weather: WeatherSnapshot, at: Date = new Date()): FishingIndex {
  const month = at.getMonth() + 1;
  const hour = at.getHours();
  const summer = month >= 6 && month <= 9;
  const hotNoon = summer && weather.temperatureC >= 30 && hour >= 10 && hour <= 16;
  const windy = weather.windKmh >= 25;
  const prime = (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19);
  const storm = isStorm(weather.weatherCode, weather.precipitationMm);
  const lightRain = isLightRain(weather.weatherCode, weather.precipitationMm);

  let score = 62;
  const reasons: string[] = [];

  if (hotNoon) {
    score -= 18;
    reasons.push(`盛夏正午 ${weather.temperatureC.toFixed(0)}°C，出钓偏热`);
  }

  if (weather.temperatureC >= 18 && weather.temperatureC <= 26 && !hotNoon) {
    score += 8;
    reasons.push(`气温 ${weather.temperatureC.toFixed(0)}°C，出门体感合适`);
  } else if (weather.temperatureC < 8) {
    score -= 18;
    reasons.push(`气温 ${weather.temperatureC.toFixed(0)}°C 过低`);
  } else if (weather.temperatureC >= 35) {
    score -= 14;
    reasons.push(`气温 ${weather.temperatureC.toFixed(0)}°C 过高`);
  }

  if (windy) {
    score -= 12;
    reasons.push(`风速 ${weather.windKmh.toFixed(0)} km/h，抛投变难`);
  }

  if (storm) {
    score -= 30;
    reasons.push('大雨或雷暴，不宜强求出门');
  } else if (lightRain) {
    score += 6;
    reasons.push('有轻降水，岸边作业尚可');
  }

  if (prime && !hotNoon) {
    score += 8;
    reasons.push('正值晨昏窗口');
  }

  const uv = weather.uvIndex;
  if (uv != null && uv >= 8 && hour >= 10 && hour <= 16) {
    score -= 6;
    reasons.push(`紫外 ${uv.toFixed(0)}，注意防晒`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (reasons.length < 2) {
    reasons.push(`体感 ${weather.apparentC.toFixed(0)}°C`);
  }

  return { score, label: indexBand(score), reasons: reasons.slice(0, 4) };
}

export function outingLabel(label: FishingIndexLabel): string {
  if (label === '很高' || label === '较高') return '适宜出钓';
  if (label === '一般') return '可以出钓';
  if (label === '偏低') return '谨慎出钓';
  return '不宜出钓';
}
