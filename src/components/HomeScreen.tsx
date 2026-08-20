import { useEffect, useState } from 'react';
import { catalogForStyle, coerceFishForStyle } from '../lib/fishId/catalog';
import { hourLabel, type HourlyForecast } from '../lib/forecast';
import { outingLabel } from '../lib/fishingIndex';
import { fishGuide } from '../lib/fishGuide';
import {
  flavorSliderPct,
  hourBarHeights,
  indexRingOffset,
  layerBand,
  layerStance,
  precipWetDry,
  pressureTrend,
  windowNowPct,
  INDEX_RING_LEN,
} from '../lib/homeView';
import { weatherLabel, windDirLabel, windScaleLabel } from '../lib/weather';
import { windowCountdown } from '../lib/windowCountdown';
import type { FishStyle, FishingAdvice, FishingIndex, WeatherSnapshot } from '../types';

export type HomeSheet = 'advice' | 'venues' | 'daily' | 'share' | 'weather' | 'target' | 'catch' | 'spot' | 'guide' | 'author';

type Props = {
  weather: WeatherSnapshot | null;
  hourly?: HourlyForecast[];
  loading: boolean;
  error: string | null;
  index: FishingIndex | null;
  advice: FishingAdvice | null;
  onRefresh: () => void;
  onOpen: (sheet: HomeSheet) => void;
  targetFish: string;
  style: FishStyle;
  onStyleChange: (style: FishStyle) => void;
  locating?: boolean;
};

const LAYER_COPY: Record<'上' | '中' | '底', { idle: string; active: string }> = {
  上: { idle: '急降才去', active: '今日主攻' },
  中: { idle: '口轻再探', active: '今日主攻' },
  底: { idle: '贴底守口', active: '今日主攻' },
};

export function HomeScreen({
  weather,
  hourly = [],
  loading,
  error,
  index,
  advice,
  onRefresh,
  onOpen,
  targetFish,
  style,
  onStyleChange,
  locating,
}: Props) {
  const fish = coerceFishForStyle(targetFish || advice?.targetFish[0] || '', style);
  const bait = advice ? (style === '路亚' ? advice.lure : advice.baitLabel) : '—';
  const spot = advice?.spot ?? '—';
  const outing = index ? outingLabel(index.label) : loading ? '读取中' : '—';
  const band = advice ? layerBand(advice.layer) : null;
  const stance = advice ? layerStance(advice.layer) : '—';
  const precip = weather ? precipWetDry(weather.precipitationMm, weather.weatherCode) : '—';
  const hours = hourly.slice(0, 6);
  const bars = hourBarHeights(hours.map((row) => row.temperatureC));
  const humidity = weather?.humidityPct ?? 0;
  const score = index?.score ?? 0;
  const dash = indexRingOffset(score);
  const flavorPct = flavorSliderPct(advice?.flavor ?? '');
  const delta = weather?.pressureDelta3h ?? 0;
  const trend = weather ? pressureTrend(delta) : '—';
  const locLabel = locating ? '定位中' : '上海';

  return (
    <div className="home">
      <div className="home-main">
        <header className="brand-row">
          <h1 className="brand-word">渔见</h1>
          <button type="button" className="loc-chip" onClick={onRefresh} aria-label="刷新天气与定位">
            {locLabel}
          </button>
        </header>

        <section className="home-hero">
          <div>
            <p className="home-temp">
              {weather ? `${weather.temperatureC.toFixed(0)}°` : loading ? '—' : '--'}
              <span>气温</span>
            </p>
            <p className="home-go">{error ?? outing}</p>
          </div>
          <div className="idx" aria-label={`钓鱼推荐指数 ${index ? score : '—'}，${index?.label ?? ''}`}>
            <div className="idx-dial">
              <svg width="88" height="88" viewBox="0 0 148 148" aria-hidden>
                <circle cx="74" cy="74" r="58" fill="none" stroke="#1a2433" strokeWidth="11" />
                <circle
                  cx="74"
                  cy="74"
                  r="58"
                  fill="none"
                  stroke="#3dff8a"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={INDEX_RING_LEN}
                  strokeDashoffset={dash}
                  transform="rotate(-90 74 74)"
                />
              </svg>
              <b>{index ? score : '—'}</b>
              <small>{index?.label ?? ''}</small>
            </div>
            <p className="idx-cap">钓鱼推荐指数</p>
          </div>
        </section>

        <button type="button" className="wx-compact" onClick={() => onOpen('weather')} aria-label="打开气象详情">
          <div className="wx-top">
            <span className="cond">天气 {weather ? weatherLabel(weather.weatherCode) : loading ? '读取中' : '—'}</span>
            <span className="wx-wind">
              风向 {weather ? `${windDirLabel(weather.windDirDeg)} ${windScaleLabel(weather.windKmh)}` : '—'}
            </span>
            <span className="dry">降水 {precip}</span>
          </div>
          {hours.length ? (
            <>
              <div className="wx-bars" aria-hidden>
                {hours.map((row, i) => (
                  <div key={row.at} className={i === 0 ? 'on' : undefined}>
                    <i style={{ height: `${bars[i] ?? 40}%` }} />
                  </div>
                ))}
              </div>
              <div className="bar-hours">
                {hours.map((row) => (
                  <span key={`${row.at}-lab`}>{hourLabel(row.at)}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="wx-empty">{error || '正在读取上海气象'}</p>
          )}
          <div className="wx-mid">
            <div className="wx-cell">
              <div className="wx-val">
                <strong>{weather ? `${humidity.toFixed(0)}%` : '—'}</strong>
                <em>湿度</em>
              </div>
              <div className="meter">
                <div className="thermo">
                  <i style={{ width: `${Math.max(8, Math.min(100, humidity))}%` }} />
                </div>
              </div>
              <span className="hint">不代表溶氧</span>
            </div>
            <div className="wx-cell">
              <div className="wx-val">
                <strong>{weather ? weather.pressureHpa.toFixed(0) : '—'}</strong>
                <em>hPa 气压</em>
              </div>
              <div className="meter">
                <svg className="baro" viewBox="0 0 120 32" aria-hidden>
                  <path d="M10 30 A50 50 0 0 1 110 30" fill="none" stroke="#1a2433" strokeWidth="6" />
                  <path
                    d="M10 30 A50 50 0 0 1 78 8"
                    fill="none"
                    stroke="#ffb020"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="hint">
                {trend} 3小时 {delta >= 0 ? '+' : ''}
                {delta.toFixed(1)} hPa
              </span>
            </div>
          </div>
        </button>

        <section className="plan-core">
          <div className="seg" role="tablist" aria-label="钓法偏好">
            <button type="button" className={style === '台钓' ? 'on' : undefined} onClick={() => onStyleChange('台钓')}>
              台钓
            </button>
            <button type="button" className={style === '路亚' ? 'on' : undefined} onClick={() => onStyleChange('路亚')}>
              路亚
            </button>
          </div>
          <div className="plan-core-head">
            <h2>
              {fish} · 今日怎么钓
            </h2>
            <button type="button" className="ghost" onClick={() => onOpen('target')}>
              换鱼
            </button>
          </div>

          <div className="board">
            <div className="col" aria-label={`水层：${advice?.layer ?? '—'}主攻`}>
              {(['上', '中', '底'] as const).map((key) => (
                <span key={key} className={band === key ? 'on' : undefined}>
                  <b>{key}</b>
                  <em>{band === key ? LAYER_COPY[key].active : LAYER_COPY[key].idle}</em>
                </span>
              ))}
            </div>
            <div className="plan">
              <h3>{stance}</h3>
              <p className="sub">水层 · {advice?.layer ?? '—'}</p>
              <p>{advice?.tip ?? (loading ? '正在计算今日方案' : '天气到位后给出水层与饵料。')}</p>
              <div className="chips">
                {index ? <span className="tag idx">钓鱼推荐指数 {score} {index.label}</span> : null}
                {index?.reasons.slice(0, 3).map((row) => (
                  <span key={row} className="tag">
                    {row}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="logic">
            <article>
              <h4>为什么{stance}</h4>
              <ol>
                {(advice?.reasons ?? ['等待气象后给出水层依据']).map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ol>
            </article>
            <article>
              <h4>为什么{style === '路亚' ? bait : `${advice?.flavor ?? ''}${advice?.form ?? ''}` || '这款饵'}</h4>
              {style === '台钓' && advice?.flavor ? (
                <div className="flavor" aria-label={`味型：${advice.flavor}`}>
                  <span>大腥</span>
                  <span className="bar">
                    <i style={{ left: `${flavorPct}%` }} />
                  </span>
                  <span>清淡</span>
                </div>
              ) : null}
              <ol>
                {style === '路亚' && advice?.lureNote ? <li>{advice.lureNote}</li> : null}
                {advice?.method ? <li>{advice.method}</li> : null}
                {advice?.tip ? <li>{advice.tip}</li> : null}
              </ol>
              <button type="button" className="ghost fish-guide-btn" onClick={() => onOpen('guide')}>
                介绍
              </button>
              <button type="button" className="ghost fish-guide-btn" onClick={() => onOpen('advice')}>
                完整依据
              </button>
            </article>
          </div>

          <div className="moves">
            <div className="move">
              <span className="dot" />
              <div>
                <h4>{bait}</h4>
                <small>{style === '路亚' ? '拟饵 · 路亚' : '味形 · 台钓'}</small>
                <p>{style === '路亚' ? advice?.lureNote ?? advice?.tip : `${advice?.flavor ?? ''}，${advice?.form ?? ''}到底找口。`}</p>
              </div>
              <b>{band === '底' ? '沉底' : band === '中' ? '离底' : '搜层'}</b>
            </div>
            <div className="move">
              <span className="dot ok" />
              <div>
                <h4>{spot}</h4>
                <small>标点</small>
                <p>{advice?.window ? `窗口：${advice.window}` : '按对象鱼与风向选岸。'}</p>
              </div>
              <b>近岸</b>
            </div>
          </div>

          <WindowTrack />
        </section>

        <div className="home-actions">
          <button type="button" onClick={onRefresh}>
            刷新方案
          </button>
          <button type="button" className="ghost" onClick={() => onOpen('weather')}>
            气象详情
          </button>
        </div>
      </div>
    </div>
  );
}

function WindowTrack() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const c = windowCountdown(now);
  const pct = windowNowPct(now);
  const shortName = c.name === '黄昏窗口' ? '黄昏' : '晨间';
  return (
    <div className={`track${c.phase === 'in' ? ' is-live' : ''}`}>
      <p>
        作钓窗口
        <b>
          {c.remainText.slice(0, 5)} {shortName}
        </b>
      </p>
      <div className="rail" aria-hidden>
        <span className="dawn" />
        <span className="dusk" />
        <span className="now" style={{ left: `${pct}%` }} />
      </div>
      <div className="hours-lab">
        <span>05时 晨</span>
        <span>12时</span>
        <span>17时 黄昏</span>
        <span>24时</span>
      </div>
    </div>
  );
}

export function FishGuidePanel({ fish, style }: { fish: string; style: FishStyle }) {
  const guide = fishGuide(fish);
  return (
    <article className="fish-guide">
      <p className="share-kicker">
        {guide.aliases} · 当前{style}
      </p>
      <h3>{guide.name}</h3>
      <p className="fish-guide-intro">{guide.intro}</p>
      <h4>栖息与标点</h4>
      <p>{guide.habitat}</p>
      {guide.tips.map((row) => (
        <section key={row.style} data-current={row.style === style ? 'true' : 'false'}>
          <h4>{row.style}技巧推荐</h4>
          <ul>
            {row.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="muted">整理自公开垂钓经验，运行时不联网，不编造溶氧与水温。</p>
    </article>
  );
}

export function TargetFishSheet({
  current,
  style,
  onPick,
}: {
  current: string;
  style: FishStyle;
  onPick: (name: string) => void;
}) {
  const names = catalogForStyle(style);
  return (
    <div className="target-catalog">
      <p className="target-hint">只列出{style}对象鱼。白条、罗非、鲶、塘鲺可兼钓。</p>
      <div className="fish-id-alts catalog">
        {names.map((name) => (
          <button key={name} type="button" className={current === name ? 'active' : 'ghost'} onClick={() => onPick(name)}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

