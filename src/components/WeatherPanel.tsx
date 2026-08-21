import { dailyFishingIndex, hourLabel, shanghaiDate, weekdayLabel, type DailyForecast, type HourlyForecast } from '../lib/forecast';
import { weatherLabel, windDirLabel, windScaleLabel } from '../lib/weather';
import { inferWaterTint, uvLabel, visibilityLabel } from '../lib/waterTint';
import type { WeatherSnapshot } from '../types';

type Props = {
  weather: WeatherSnapshot | null;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
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

export function WeatherPanel({ weather, hourly, daily, loading, error, onRetry, onLocate }: Props) {
  const today = weather ? shanghaiDate(weather.at) : shanghaiDate(new Date());
  const tint = weather
    ? inferWaterTint({
        precipNowMm: weather.precipitationMm,
        precip6hMm: weather.precip6hMm ?? 0,
        precip24hMm: weather.precip24hMm ?? 0,
        weatherCode: weather.weatherCode,
      })
    : null;
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
          <button type="button" className="ghost" onClick={onRetry}>
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
              <span>海平面气压</span>
              <strong>{weather.pressureHpa.toFixed(1)} hPa</strong>
              <small>模式网格，不是水体 · 3小时 {trend(weather.pressureDelta3h)}</small>
            </li>
            <li>
              <span>湿度</span>
              <strong>{weather.humidityPct.toFixed(0)}%</strong>
              <small>不代表溶氧 · 体感 {weather.apparentC.toFixed(1)}°</small>
            </li>
            <li>
              <span>风</span>
              <strong>{weather.windKmh.toFixed(0)} km/h</strong>
              <small>{windDirLabel(weather.windDirDeg)}</small>
            </li>
            <li>
              <span>降水</span>
              <strong>{weather.precipitationMm.toFixed(1)} mm</strong>
              <small>
                近6小时 {(weather.precip6hMm ?? 0).toFixed(1)} mm · 近24小时 {(weather.precip24hMm ?? 0).toFixed(1)} mm
              </small>
            </li>
            <li>
              <span>水色推演</span>
              <strong>{tint?.tint ?? '—'}</strong>
              <small>近时降水浊度，不是塘边所见。请到策略页点选目测。</small>
            </li>
            <li>
              <span>能见度</span>
              <strong>{visibilityLabel(weather.visibilityM)}</strong>
              <small>空气视程，不是水下</small>
            </li>
            <li>
              <span>紫外</span>
              <strong>{uvLabel(weather.uvIndex)}</strong>
              <small>出门防晒，不是鱼口</small>
            </li>
            <li>
              <span>露点</span>
              <strong>{weather.dewPointC != null ? `${weather.dewPointC.toFixed(1)}°` : '—'}</strong>
              <small>空气露点，不是水温</small>
            </li>
            <li>
              <span>阵风</span>
              <strong>{weather.windGustKmh != null ? `${weather.windGustKmh.toFixed(0)} km/h` : '—'}</strong>
              <small>云量 {weather.cloudPct}%</small>
            </li>
          </ul>
          {hourly.length ? (
            <>
              <h3 className="forecast-title">未来 24 小时</h3>
              <ul className="forecast-hours">
                {hourly.map((row) => (
                  <li key={row.at}>
                    <span>{hourLabel(row.at)}</span>
                    <strong>{row.temperatureC.toFixed(0)}°</strong>
                    <small>{weatherLabel(row.weatherCode)}</small>
                    <em>{row.precipitationMm > 0 ? `${row.precipitationMm.toFixed(1)}mm` : windScaleLabel(row.windKmh)}</em>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {daily.length ? (
            <>
              <h3 className="forecast-title">未来 7 天</h3>
              <ul className="forecast-days">
                {daily.map((row) => {
                  const index = dailyFishingIndex(row, { lat: weather.lat, lon: weather.lon });
                  return (
                    <li key={row.date}>
                      <div>
                        <strong>{weekdayLabel(row.date, today)}</strong>
                        <span>
                          {weatherLabel(row.weatherCode)} · {windScaleLabel(row.windKmh)}
                        </span>
                      </div>
                      <div>
                        <b>
                          {row.tempMaxC.toFixed(0)}° / {row.tempMinC.toFixed(0)}°
                        </b>
                        <small>
                          {row.precipitationMm > 0 ? `降水 ${row.precipitationMm.toFixed(1)}mm · ` : ''}
                          指数 {index.label}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="muted">日指数用当日气温、风和降水估算，不是溶氧或水温实测。水色由近时降水推演，不是测站。</p>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
