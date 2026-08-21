import { useEffect, useState } from 'react';
import { catalogForStyle, coerceFishForStyle } from '../lib/fishId/catalog';
import { hourLabel, type HourlyForecast } from '../lib/forecast';
import { outingLabel } from '../lib/fishingIndex';
import { fishGuide } from '../lib/fishGuide';
import { auditFishStyle } from '../lib/fishHandbookAudit';
import type { FishPublicNote } from '../lib/fishLookup';
import {
  baitWhyRows,
  flavorSliderPct,
  homeIndexTags,
  hourBarHeights,
  indexRingOffset,
  layerBand,
  layerLead,
  layerMarkerPct,
  layerStance,
  layerWhyRows,
  outingShort,
  precipWetDry,
  pressureTrend,
  windowNowPct,
  INDEX_RING_LEN,
  type LayerBand,
} from '../lib/homeView';
import { weatherLabel, windDirLabel, windScaleLabel } from '../lib/weather';
import { SIGHTED_WATER, sightedWaterHow } from '../lib/sightedWater';
import { windowCountdown } from '../lib/windowCountdown';
import type { FishStyle, FishingAdvice, FishingIndex, SightedWater, WeatherSnapshot } from '../types';

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
  sightedWater: SightedWater | null;
  onSightedWaterChange: (value: SightedWater | null) => void;
  locating?: boolean;
};

const LAYER_COPY: Record<LayerBand, { idle: string; active: string }> = {
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
  sightedWater,
  onSightedWaterChange,
  locating,
}: Props) {
  const fish = coerceFishForStyle(targetFish || advice?.targetFish[0] || '', style);
  const bait = advice ? (style === '路亚' ? advice.lure : advice.baitLabel) : '—';
  const spot = advice?.spot ?? '—';
  const outing = index ? outingShort(index.label) : loading ? '读取中' : outingLabel('一般');
  const band = advice ? layerBand(advice.layer) : null;
  const stance = advice ? layerStance(advice.layer, style) : '—';
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
  const guide = fishGuide(fish);
  const whyLayer = layerWhyRows({
    fish,
    habitat: guide.habitat,
    layer: advice?.layer ?? '—',
    pressureHpa: weather?.pressureHpa ?? null,
    deltaHpa: weather?.pressureDelta3h ?? null,
    trend,
    precip: precip === '—' ? '干' : precip,
    sightedWater,
  });
  const whyBait = baitWhyRows({
    style,
    flavor: advice?.flavor ?? '—',
    form: advice?.form ?? '—',
    lure: advice?.lure ?? '—',
    lureNote: advice?.lureNote ?? '',
    method: advice?.method ?? '—',
    tempC: weather?.temperatureC ?? null,
    lureColorWhy: advice?.lureColorWhy,
  });
  const tags = index
    ? homeIndexTags({
        score,
        label: index.label,
        reasons: index.reasons,
        precip: precip === '—' ? '干' : precip,
        wind: weather ? windScaleLabel(weather.windKmh) : '—',
      })
    : [];

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
              <i className="compass" aria-hidden />
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
                  <line x1="60" y1="30" x2="84" y2="10" stroke="#f4f7fb" strokeWidth="2" />
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
          <div className="water-opts-block">
            <div className="water-opts-head">
              <h3>塘边水色</h3>
              <p>肉眼看塘能不能见底，点了改饵色。不是天气预报。</p>
            </div>
            <div className="seg water-picks" role="listbox" aria-label="塘边目测水色">
              <button type="button" className={!sightedWater ? 'on' : undefined} onClick={() => onSightedWaterChange(null)}>
                <i className="swatch swatch-none" aria-hidden="true" />
                <strong>未目测</strong>
              </button>
              {SIGHTED_WATER.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={sightedWater === row.id ? 'on' : undefined}
                  onClick={() => onSightedWaterChange(row.id)}
                >
                  <i className="swatch" style={{ background: row.swatch }} aria-hidden="true" />
                  <strong>{row.id}</strong>
                </button>
              ))}
            </div>
            <p className="water-how">
              {sightedWater
                ? `怎么认：${sightedWaterHow(sightedWater)}`
                : '怎么认：清澈=见底；微浑=有色看不清底；浑浊=黄泥浆几乎不透光；肥水=草绿或酱油色。'}
            </p>
          </div>
          <div className="plan-core-head">
            <div>
              <h2>
                {fish} · 今日怎么钓
              </h2>
              <button type="button" className="fish-intro" onClick={() => onOpen('guide')}>
                鱼类介绍
              </button>
            </div>
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
              {advice ? <i className="col-tick" style={{ top: `${layerMarkerPct(advice.layer)}%` }} /> : null}
            </div>
            <div className="plan">
              <h3>{stance}</h3>
              <p className="sub">水层 · {advice?.layer ?? '—'}</p>
              <p>{advice ? layerLead(fish, stance, advice.layer, advice.tip) : '等天气到位后再给出水层。'}</p>
              <div className="chips">
                {tags.map((tag) => (
                  <span key={tag.text} className={`tag${tag.kind ? ` ${tag.kind}` : ''}`}>
                    {tag.text}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="logic">
            <article>
              <h4>为什么{stance}</h4>
              <ol>
                {whyLayer.map((row) => (
                  <li key={row.k}>
                    <b>{row.k}</b>
                    {row.v}
                  </li>
                ))}
              </ol>
            </article>
            <article>
              <h4>为什么{style === '路亚' ? bait : advice?.flavor ? `${advice.flavor}${advice.form}` : '这款饵'}</h4>
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
                {whyBait.map((row) => (
                  <li key={row.k}>
                    <b>{row.k}</b>
                    {row.v}
                  </li>
                ))}
              </ol>
            </article>
          </div>

          <div className="moves">
            <div className="move">
              <span className="dot" />
              <div>
                <h4>{bait}</h4>
                <small>{style === '路亚' ? '拟饵 · 路亚' : '味形 · 台钓'}</small>
                <p>{style === '路亚' ? advice?.lureNote ?? '—' : advice?.tip ?? '—'}</p>
                {style === '路亚' && advice?.lureColors?.length ? (
                  <>
                    <ol className="lure-color-ranks">
                      {advice.lureColors.map((row, i) => (
                        <li key={row.family} className={i === 0 ? 'is-top' : undefined}>
                          <i style={{ background: row.swatch }} />
                          <span>{row.family}</span>
                          <em>{row.score}</em>
                        </li>
                      ))}
                    </ol>
                    {advice.lureColorWhy ? <p className="lure-color-why">{advice.lureColorWhy}</p> : null}
                  </>
                ) : null}
              </div>
              <b>{style === '路亚' ? '搜索' : '沉底'}</b>
            </div>
            <div className="move">
              <span className="dot ok" />
              <div>
                <h4>{spot}</h4>
                <small>标点 · 可抛</small>
                <p>{advice?.method ?? '按对象鱼与风向选岸'}</p>
              </div>
              <b>近岸</b>
            </div>
          </div>

          <WindowTrack />
        </section>

        <div className="home-actions">
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
  const auditRows = auditFishStyle(fish, style);
  const auditFailed = auditRows.filter((row) => !row.ok);
  const [note, setNote] = useState<FishPublicNote | null>(null);
  const [publicErr, setPublicErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `diaolema.fishWiki.${fish}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as FishPublicNote;
        if (parsed?.summary) {
          setNote(parsed);
          setLoading(false);
        }
      }
    } catch {
      /* ignore */
    }
    setPublicErr(null);
    setLoading(true);
    void fetch(`/api/fish-guide?name=${encodeURIComponent(fish)}`)
      .then(async (res) => {
        const data = (await res.json()) as { note?: FishPublicNote | null; error?: string | null };
        if (cancelled) return;
        if (data.note?.summary) {
          setNote(data.note);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(data.note));
          } catch {
            /* ignore */
          }
          setPublicErr(null);
        } else {
          setPublicErr(data.error || '公开条目暂缺');
        }
      })
      .catch(() => {
        if (!cancelled) setPublicErr('公开检索暂时不可用');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fish]);

  return (
    <article className="fish-guide">
      <p className="share-kicker">
        {guide.aliases} · 当前{style}
      </p>
      <h3>{guide.name}</h3>
      <dl className="fish-facts">
        <div>
          <dt>习性水层</dt>
          <dd>{guide.habitLayer}</dd>
        </div>
        <div>
          <dt>水层下限</dt>
          <dd>{guide.layerFloor ? `不低于${guide.layerFloor}` : '按气象手册'}</dd>
        </div>
        <div>
          <dt>常用钓法</dt>
          <dd>{guide.methods.join(' / ')}</dd>
        </div>
        <div>
          <dt>时节</dt>
          <dd>{guide.season}</dd>
        </div>
        <div>
          <dt>常用饵</dt>
          <dd>{guide.baitHint}</dd>
        </div>
        <div>
          <dt>体型</dt>
          <dd>{guide.size}</dd>
        </div>
        <div>
          <dt>食性</dt>
          <dd>{guide.diet}</dd>
        </div>
      </dl>
      <h4>外形</h4>
      <p>{guide.look}</p>
      <h4>上海水域</h4>
      <p>{guide.shanghai}</p>
      <p className="fish-guide-intro">{guide.intro}</p>
      <h4>栖息与标点</h4>
      <p>{guide.habitat}</p>
      <h4>注意</h4>
      <p>{guide.caution}</p>
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
      <h4>手册来源</h4>
      {guide.sources.length ? (
        <ul>
          {guide.sources.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">词表外，暂无编译手册。</p>
      )}
      {auditRows.length ? (
        <section className="fish-audit" data-ok={auditFailed.length === 0 ? 'true' : 'false'}>
          <h4>引擎核验</h4>
          <p>
            {style} × {auditRows.length} 个气象键，{auditFailed.length === 0 ? '全部与手册相符' : `${auditFailed.length} 条不符`}
            。对照习性下限与饵/拟饵关键词，不是塘边实测。
          </p>
          <ul>
            {auditRows.map((row) => (
              <li key={row.caseId}>
                {row.ok ? '相符' : '不符'} · {row.caseId} · {row.stance} · {row.layer}
                {row.mismatches.length ? ` · ${row.mismatches.join('；')}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="fish-public">
        <h4>公开百科补充</h4>
        {loading ? <p className="muted">正在检索公开条目…</p> : null}
        {note ? (
          <>
            <p>{note.summary}</p>
            <a href={note.url} target="_blank" rel="noreferrer">
              来源：{note.source}
            </a>
          </>
        ) : null}
        {!loading && publicErr && !note ? <p className="muted">{publicErr}</p> : null}
        <p className="muted">公开摘录不是塘边实测，不编造溶氧与水温。</p>
      </section>
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
