import { useEffect, useState } from 'react';
import { CatchShareFeed } from './CatchShareFeed';
import { PhotoCapture } from './PhotoCapture';
import { catalogForStyle, coerceFishForStyle } from '../lib/fishId/catalog';
import { outingLabel } from '../lib/fishingIndex';
import { weatherLabel, windDirLabel, windScaleLabel } from '../lib/weather';
import { fishGuide } from '../lib/fishGuide';
import { windowCountdown } from '../lib/windowCountdown';
import logoUrl from '../assets/logo.svg?url';
import type { CatchReport, FishIdResult, FishStyle, FishingAdvice, FishingIndex, WeatherSnapshot } from '../types';

export type HomeSheet = 'fishid' | 'advice' | 'venues' | 'daily' | 'share' | 'weather' | 'target' | 'catch' | 'spot' | 'guide';

type Props = {
  weather: WeatherSnapshot | null;
  loading: boolean;
  error: string | null;
  index: FishingIndex | null;
  advice: FishingAdvice | null;
  lastId: FishIdResult | null;
  onRefresh: () => void;
  onOpen: (sheet: HomeSheet) => void;
  targetFish: string;
  style: FishStyle;
  onStyleChange: (style: FishStyle) => void;
  reports: CatchReport[];
  onOpenInbox: () => void;
  onOpenShare: (report: CatchReport) => void;
  onFishPhoto: (file: File) => void;
  locating?: boolean;
};

export function HomeScreen({
  weather,
  loading,
  error,
  index,
  advice,
  lastId,
  onRefresh,
  onOpen,
  targetFish,
  style,
  onStyleChange,
  reports,
  onOpenInbox,
  onOpenShare,
  onFishPhoto,
  locating,
}: Props) {
  const fish = coerceFishForStyle(targetFish || advice?.targetFish[0] || '', style);
  const bait = advice ? (style === '路亚' ? advice.lure : advice.baitLabel) : '—';
  const spot = advice?.spot ?? '—';
  const outing = index ? outingLabel(index.label) : loading ? '读取中' : '—';
  const meta = weather
    ? [
        weatherLabel(weather.weatherCode),
        `${windDirLabel(weather.windDirDeg)} ${windScaleLabel(weather.windKmh)}`,
        `${weather.humidityPct.toFixed(0)}%`,
        `${weather.pressureHpa.toFixed(0)}hPa`,
      ].join(' · ')
    : error || '正在读取上海气象';
  const line = locating ? `${meta} · 定位中` : meta;

  const idName = lastId?.species && lastId.species !== '不确定' ? lastId.species : null;

  return (
    <div className="home">
      <div className="home-main">
        <header className="brand-row">
          <div className="brand-mark">
            <img src={logoUrl} alt="" width={44} height={44} />
            <div className="brand-name">
              <h1>渔见</h1>
              <p>FISHING INSIGHT</p>
            </div>
          </div>
          <button type="button" className="avatar-btn" onClick={onRefresh} aria-label="刷新天气">
            沪
          </button>
        </header>

        <section className="wx-card">
          <button type="button" className="wx-hit" onClick={() => onOpen('weather')}>
            <p className="wx-temp">
              {weather ? `${weather.temperatureC.toFixed(0)}°` : loading ? '—' : '--'}
              <em>{outing}</em>
            </p>
            <p className="wx-sub">{line}</p>
          </button>
          <WindowCountdownBar />
        </section>

        <section className="plan-card">
          <div className="plan-head">
            <span className="gold-pill">今日方案</span>
            <div className="style-switch" role="tablist" aria-label="钓法偏好">
              <button type="button" data-on={style === '台钓' ? 'true' : 'false'} onClick={() => onStyleChange('台钓')}>
                台钓
              </button>
              <button type="button" data-on={style === '路亚' ? 'true' : 'false'} onClick={() => onStyleChange('路亚')}>
                路亚
              </button>
            </div>
          </div>
          <h2 className="plan-title">
            <button type="button" className="fish-pick" onClick={() => onOpen('target')}>
              {fish}
            </button>
            <button type="button" className="fish-guide-btn" onClick={() => onOpen('guide')}>
              介绍
            </button>
            <span> · {advice?.layer ?? '—'}</span>
          </h2>
          {style === '路亚' && advice?.lureNote ? <p className="plan-lead">{advice.lureNote}</p> : null}
          <div className="plan-grid">
            <article>
              <small>{style === '路亚' ? '拟饵' : '味形'}</small>
              <strong className={style === '路亚' ? 'lure-pick' : undefined}>{bait}</strong>
            </article>
            <article>
              <small>标点</small>
              <strong className="teal">{spot}</strong>
            </article>
          </div>
        </section>

        <div className="id-card">
          <button type="button" className="id-card-hit" onClick={() => onOpen('fishid')}>
            <span className="id-art" aria-hidden>
              <FishMark />
            </span>
            <span className="id-copy">
              <span>AI 识鱼</span>
              <strong>{idName ?? '拍一张渔获'}</strong>
            </span>
            {lastId && idName ? <b className="id-pct">{Math.round(lastId.confidence * 100)}%</b> : null}
          </button>
          <PhotoCapture showAlbum={false} cameraLabel="拍照" cameraClassName="id-shot" onPick={onFishPhoto} />
        </div>
      </div>

      <CatchShareFeed reports={reports} onOpenAll={onOpenInbox} onOpenDetail={onOpenShare} />
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

function WindowCountdownBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const c = windowCountdown(now);
  return (
    <p className={`wx-window${c.phase === 'in' ? ' is-live' : ''}`}>
      <strong>{c.title}</strong>
      <em>{c.remainText}</em>
    </p>
  );
}

function FishMark() {
  return (
    <svg viewBox="0 0 104 104" aria-hidden>
      <line x1="0" y1="52" x2="104" y2="52" stroke="#E8B24A" strokeWidth="2" opacity="0.7" />
      <g transform="translate(12 26)">
        <polygon points="65,23 88,8 88,42" fill="#8B7957" />
        <ellipse cx="39" cy="27" rx="42" ry="25" fill="url(#fishBodyHome)" />
        <polygon points="27,2 47,12 18,12" fill="#A9956D" />
        <circle cx="21" cy="24" r="4" fill="#211B13" />
        <circle cx="22.2" cy="22.8" r="1.3" fill="#FFFFFF" />
      </g>
      <defs>
        <linearGradient id="fishBodyHome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E2D0A6" />
          <stop offset="0.52" stopColor="#BCA982" />
          <stop offset="1" stopColor="#7C6C4E" />
        </linearGradient>
      </defs>
    </svg>
  );
}
