import { weatherLabel, windDirLabel } from '../lib/weather';
import type { WeatherSnapshot } from '../types';

type Props = {
  weather: WeatherSnapshot | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onLocate: () => void;
};

function trend(delta: number): string {
  if (delta <= -1.5) return `下降 ${Math.abs(delta).toFixed(1)}`;
  if (delta >= 1.5) return `上升 ${delta.toFixed(1)}`;
  return `平稳 ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`;
}

export function WeatherPanel({ weather, loading, error, onRetry, onLocate }: Props) {
  return (
    <section className="panel weather-panel">
      <header>
        <h2>实时天气</h2>
        <button type="button" className="ghost" onClick={onLocate}>
          定位
        </button>
      </header>
      {loading && <p className="muted">正在读取上海气象…</p>}
      {error && (
        <p className="error">
          {error}{' '}
          <button type="button" onClick={onRetry}>
            重试
          </button>
        </p>
      )}
      {weather && (
        <>
          <p className="weather-hero">
            <span>{weather.temperatureC.toFixed(1)}°</span>
            <em>{weatherLabel(weather.weatherCode)}</em>
          </p>
          <ul className="metrics">
            <li>
              <span>气压</span>
              <strong>{weather.pressureHpa.toFixed(1)} hPa</strong>
              <small>3小时 {trend(weather.pressureDelta3h)}</small>
            </li>
            <li>
              <span>湿度</span>
              <strong>{weather.humidityPct.toFixed(0)}%</strong>
              <small>体感 {weather.apparentC.toFixed(1)}°</small>
            </li>
            <li>
              <span>风</span>
              <strong>{weather.windKmh.toFixed(0)} km/h</strong>
              <small>{windDirLabel(weather.windDirDeg)}</small>
            </li>
            <li>
              <span>降水</span>
              <strong>{weather.precipitationMm.toFixed(1)} mm</strong>
              <small>云量 {weather.cloudPct}%</small>
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
