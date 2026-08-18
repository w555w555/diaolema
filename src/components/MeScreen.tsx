import { useMemo, useState } from 'react';
import logoUrl from '../assets/logo.svg?url';
import { formatCatchCaption, sourceLabel } from '../lib/caption';
import { HUB_PRODUCTS, loadWishIds } from '../lib/hub';
import { DEMO_FANS, fanCount, loadProfile, saveProfile, type MeFan, type MeProfile } from '../lib/meProfile';
import { getShareSocial } from '../lib/shareSocial';
import type { CatchReport } from '../types';
import { ShareImport } from './ShareImport';

export type MeStart = 'home' | 'catches';
type MeView = MeStart | 'wish' | 'share' | 'weather' | 'about' | 'edit' | 'fans' | 'follows';

type Props = {
  startView?: MeStart;
  reports: CatchReport[];
  lat: number;
  lon: number;
  onImport: (report: CatchReport) => void;
  onNavigateCatch: (report: CatchReport) => void;
  onOpenDaily: () => void;
  onLocate: () => void;
  onRetryWeather: () => void;
};

const TITLES: Record<MeView, string> = {
  home: '我的',
  catches: '渔获记录',
  wish: '想买清单',
  share: '分享入库',
  weather: '定位与天气',
  about: '关于渔见',
  edit: '编辑资料',
  fans: '粉丝',
  follows: '关注',
};

export function MeScreen({
  startView = 'home',
  reports,
  lat,
  lon,
  onImport,
  onNavigateCatch,
  onOpenDaily,
  onLocate,
  onRetryWeather,
}: Props) {
  const [view, setView] = useState<MeView>(startView);
  const [profile, setProfile] = useState(loadProfile);
  const wishIds = loadWishIds();
  const follows = getShareSocial().follows;
  const fans = DEMO_FANS;
  const wishItems = useMemo(
    () => HUB_PRODUCTS.filter((item) => wishIds.includes(item.id)),
    [wishIds],
  );

  const back = () => setView('home');

  return (
    <div className="page-scroll me-page">
      {view === 'home' ? (
        <MeHome
          profile={profile}
          catchCount={reports.length}
          followCount={follows.length}
          fanCount={fanCount(fans)}
          wishCount={wishIds.length}
          onOpen={setView}
        />
      ) : (
        <>
          <header className="me-subhead">
            <button type="button" className="ghost" onClick={back}>
              返回
            </button>
            <h2>{TITLES[view]}</h2>
          </header>
          {view === 'catches' ? <CatchList reports={reports} onNavigate={onNavigateCatch} /> : null}
          {view === 'wish' ? <WishList items={wishItems} /> : null}
          {view === 'share' ? <ShareImport lat={lat} lon={lon} onImport={onImport} /> : null}
          {view === 'weather' ? (
            <WeatherTools onLocate={onLocate} onRetry={onRetryWeather} />
          ) : null}
          {view === 'fans' ? <PeopleList people={fans} empty="还没有粉丝。" /> : null}
          {view === 'follows' ? (
            <PeopleList
              people={follows.map((name) => ({ id: name, name, city: '上海', note: '已关注' }))}
              empty="还没有关注作者。去首页分享流点关注。"
              sample={false}
            />
          ) : null}
          {view === 'about' ? <AboutYujian /> : null}
          {view === 'edit' ? (
            <EditProfile
              profile={profile}
              onSave={(next) => {
                setProfile(saveProfile(next));
                setView('home');
              }}
            />
          ) : null}
        </>
      )}
      {view === 'home' ? (
        <MeMenus
          catchCount={reports.length}
          wishCount={wishIds.length}
          fanTotal={fanCount(fans)}
          onOpen={setView}
          onOpenDaily={onOpenDaily}
        />
      ) : null}
    </div>
  );
}

function MeHome({
  profile,
  catchCount,
  followCount,
  fanCount: fansNum,
  wishCount,
  onOpen,
}: {
  profile: MeProfile;
  catchCount: number;
  followCount: number;
  fanCount: number;
  wishCount: number;
  onOpen: (view: MeView) => void;
}) {
  return (
    <section className="me-hero">
      <button type="button" className="me-user" onClick={() => onOpen('edit')}>
        <img src={logoUrl} alt="" width={64} height={64} />
        <div>
          <strong>{profile.name}</strong>
          <span>
            {profile.city} · {profile.bio}
          </span>
        </div>
        <em>编辑</em>
      </button>
      <ul className="me-stats">
        <li>
          <button type="button" onClick={() => onOpen('catches')}>
            <b>{catchCount}</b>
            <span>渔获</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('follows')}>
            <b>{followCount}</b>
            <span>关注</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('fans')}>
            <b>{fansNum}</b>
            <span>粉丝</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('wish')}>
            <b>{wishCount}</b>
            <span>想买</span>
          </button>
        </li>
      </ul>
    </section>
  );
}

function MeMenus({
  catchCount,
  wishCount,
  fanTotal,
  onOpen,
  onOpenDaily,
}: {
  catchCount: number;
  wishCount: number;
  fanTotal: number;
  onOpen: (view: MeView) => void;
  onOpenDaily: () => void;
}) {
  return (
    <>
      <ul className="me-group">
        <li>
          <button type="button" onClick={() => onOpen('catches')}>
            <i data-kind="catch" aria-hidden />
            渔获记录
            <em>{catchCount}</em>
            <span>›</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('fans')}>
            <i data-kind="fans" aria-hidden />
            我的粉丝
            <em>{fanTotal}</em>
            <span>›</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('wish')}>
            <i data-kind="wish" aria-hidden />
            想买清单
            <em>{wishCount}</em>
            <span>›</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('share')}>
            <i data-kind="share" aria-hidden />
            分享入库
            <span>›</span>
          </button>
        </li>
      </ul>
      <ul className="me-group">
        <li>
          <button type="button" onClick={() => onOpen('weather')}>
            <i data-kind="weather" aria-hidden />
            定位与天气
            <span>›</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={onOpenDaily}>
            <i data-kind="daily" aria-hidden />
            鱼情日报
            <span>›</span>
          </button>
        </li>
      </ul>
      <ul className="me-group">
        <li>
          <button type="button" onClick={() => onOpen('about')}>
            <i data-kind="about" aria-hidden />
            关于渔见
            <span>›</span>
          </button>
        </li>
      </ul>
    </>
  );
}

function PeopleList({
  people,
  empty,
  sample = true,
}: {
  people: Pick<MeFan, 'id' | 'name' | 'city' | 'note'>[];
  empty: string;
  sample?: boolean;
}) {
  if (!people.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="me-people">
      {people.map((row) => (
        <li key={row.id}>
          <i aria-hidden>{row.name.slice(-1)}</i>
          <div>
            <strong>{row.name}</strong>
            <span>
              {row.city} · {row.note}
              {sample ? ' · 示例' : ''}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CatchList({
  reports,
  onNavigate,
}: {
  reports: CatchReport[];
  onNavigate: (report: CatchReport) => void;
}) {
  if (!reports.length) return <p className="muted">还没有渔获记录。</p>;
  return (
    <ul className="me-feed">
      {reports.slice(0, 20).map((row) => (
        <li key={row.id}>
          <strong>{formatCatchCaption(row)}</strong>
          <span>
            {sourceLabel(row.source)}
            {row.note ? ` · ${row.note}` : ''}
          </span>
          <button type="button" className="ghost" onClick={() => onNavigate(row)}>
            导航
          </button>
        </li>
      ))}
    </ul>
  );
}

function WishList({ items }: { items: { id: string; name: string; kind: string; priceYuan: number }[] }) {
  if (!items.length) return <p className="muted">还没有想买的装备。去渔圈商城加点。</p>;
  return (
    <ul className="me-feed">
      {items.map((item) => (
        <li key={item.id}>
          <strong>{item.name}</strong>
          <span>
            {item.kind} · ¥{item.priceYuan} · 示例，不可下单
          </span>
        </li>
      ))}
    </ul>
  );
}

function WeatherTools({ onLocate, onRetry }: { onLocate: () => void; onRetry: () => void }) {
  return (
    <div className="me-tools">
      <p className="muted">定位只用来刷新当前点气象，不上传账号。</p>
      <button type="button" onClick={onLocate}>
        定位
      </button>
      <button type="button" className="ghost" onClick={onRetry}>
        重试天气
      </button>
    </div>
  );
}

function AboutYujian() {
  return (
    <article className="me-about">
      <img src={logoUrl} alt="" width={64} height={64} />
      <h3>渔见</h3>
      <p>FISHING INSIGHT</p>
      <span>本机演示 · 不接账号登录</span>
      <p className="muted">天气、渔获与群聊都留在本机。粉丝为示例名单，不接私信。</p>
    </article>
  );
}

function EditProfile({
  profile,
  onSave,
}: {
  profile: MeProfile;
  onSave: (next: MeProfile) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [city, setCity] = useState(profile.city);
  const [bio, setBio] = useState(profile.bio);
  return (
    <form
      className="me-edit"
      onSubmit={(ev) => {
        ev.preventDefault();
        onSave({ name, city, bio });
      }}
    >
      <label>
        昵称
        <input value={name} onChange={(ev) => setName(ev.target.value)} maxLength={12} />
      </label>
      <label>
        城市
        <input value={city} onChange={(ev) => setCity(ev.target.value)} maxLength={12} />
      </label>
      <label>
        简介
        <input value={bio} onChange={(ev) => setBio(ev.target.value)} maxLength={20} />
      </label>
      <button type="submit">保存到本机</button>
    </form>
  );
}
