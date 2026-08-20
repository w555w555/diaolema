import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AdvicePanel } from './components/AdvicePanel';
import { BottomNav, type TabId } from './components/BottomNav';
import { CatchMap } from './components/CatchMap';
import { DailyReport } from './components/DailyReport';
import { FishIdPanel } from './components/FishIdPanel';
import { AuthorProfile } from './components/AuthorProfile';
import { CatchShareDetail } from './components/CatchShareFeed';
import { HomeScreen, TargetFishSheet, FishGuidePanel, type HomeSheet } from './components/HomeScreen';
import { HubScreen } from './components/HubScreen';
import { MeScreen } from './components/MeScreen';
import { ReportForm } from './components/ReportForm';
import { ShareImport } from './components/ShareImport';
import { Sheet } from './components/Sheet';
import { Splash } from './components/Splash';
import { VenueDetail } from './components/VenueDetail';
import { VenueList } from './components/VenueList';
import { WeatherPanel } from './components/WeatherPanel';
import { buildAdvice } from './lib/advice';
import { buildFishingIndex } from './lib/fishingIndex';
import { createUserReport, isOwnedCatch, loadReports, loadServerReports, mergeReports, persistReport, persistReportToServer, removeReport } from './lib/intel';
import { cloudWrite, deleteCatch, hydrateLocalFromCloud, pullCatches, pullPublicCatches, publishCatchImages, publishCatchVideo, pushCatch } from './lib/userCloud';
import { getSupabase, hydrateSupabaseConfig } from './lib/supabase';
import { requestCurrentPosition } from './lib/geo';
import { DIANPING_VENUES } from './lib/venues';
import { loadSpotReviews } from './lib/spotReviews';
import { coerceFishForStyle } from './lib/fishId/catalog';
import { HUB_ROOMS, loadChatMessages } from './lib/hub';
import { buildInbox, inboxUnreadTotal, loadPreviews, loadReads, subscribeInbox } from './lib/chatInbox';
import { DEMO_FANS } from './lib/meProfile';
import { fetchWeatherBundle } from './lib/weather';
import { getSafety, hideByAuthor, hideInboxFromBlocked } from './lib/userSafety';
import { SHANGHAI_CENTER, type CatchReport, type FishStyle, type FishingVenue, type HubChatMessage, type SpotReview, type WeatherSnapshot } from './types';
import type { DailyForecast, HourlyForecast } from './lib/forecast';
import './index.css';
import './theme-oled.css';

function hubUnreadSnapshot() {
  const seen = new Set<string>();
  const pool: HubChatMessage[] = [];
  for (const row of [...loadChatMessages(), ...loadPreviews()]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    pool.push(row);
  }
  const blocked = getSafety().blocks;
  return inboxUnreadTotal(
    hideInboxFromBlocked(
      buildInbox({
        rooms: HUB_ROOMS,
        messages: hideByAuthor(pool, blocked),
        fans: DEMO_FANS.map((fan) => ({ id: fan.id, name: fan.name })),
        reads: loadReads(),
        myUserId: null,
        cloud: false,
      }),
      blocked,
    ),
  );
}

const SHEET_TITLE: Record<HomeSheet, string> = {
  advice: '今日怎么钓',
  venues: '钓场排行',
  daily: '鱼情日报',
  share: '分享入库',
  weather: '实时天气',
  target: '更换目标鱼',
  guide: '鱼类介绍',
  catch: '渔获分享',
  spot: '钓点详情',
  author: '钓友主页',
};

export function App() {
  const [tab, setTab] = useState<TabId>('home');
  const hubUnread = useSyncExternalStore(subscribeInbox, hubUnreadSnapshot, () => 0);
  const [sheet, setSheet] = useState<HomeSheet | null>(null);
  const [coords, setCoords] = useState(SHANGHAI_CENTER);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [hourly, setHourly] = useState<HourlyForecast[]>([]);
  const [daily, setDaily] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<CatchReport[]>(() => loadReports());
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState(SHANGHAI_CENTER);
  const [navTarget, setNavTarget] = useState<{ lon: number; lat: number; name: string } | null>(null);
  const [focusVenue, setFocusVenue] = useState<FishingVenue | null>(null);
  const [targetFish, setTargetFish] = useState('');
  const [style, setStyle] = useState<FishStyle>('台钓');
  const [share, setShare] = useState<CatchReport | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [splash, setSplash] = useState(true);
  const [spotReviews, setSpotReviews] = useState<SpotReview[]>(() => loadSpotReviews());
  const [spotVisit, setSpotVisit] = useState(0);
  const [locating, setLocating] = useState(false);
  const [spotVenue, setSpotVenue] = useState<FishingVenue | null>(null);
  const [meStart, setMeStart] = useState<'home' | 'catches' | 'auth'>('home');
  const [editing, setEditing] = useState<CatchReport | null>(null);
  const [spotBack, setSpotBack] = useState<HomeSheet | null>(null);
  const [, setCloudReady] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pack = await fetchWeatherBundle(coords.lat, coords.lon);
      setWeather(pack.current);
      setHourly(pack.hourly);
      setDaily(pack.daily);
    } catch (e) {
      setError(e instanceof Error ? e.message : '天气读取失败');
    } finally {
      setLoading(false);
    }
  }, [coords.lat, coords.lon]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadServerReports().then((extra) => {
      if (!extra.length) return;
      setReports((current) => mergeReports(current, extra));
    });
  }, []);

  const advice = useMemo(
    () =>
      weather
        ? buildAdvice(weather, new Date(), {
            targetFish: targetFish || undefined,
            style,
          })
        : null,
    [weather, targetFish, style],
  );
  const index = useMemo(() => (weather ? buildFishingIndex(weather) : null), [weather]);

  const locate = useCallback((from: 'weather' | 'map' = 'weather') => {
    setLocating(true);
    void requestCurrentPosition()
      .then((next) => {
        setCoords(next);
        setPick(next);
        if (from === 'weather') setError(null);
      })
      .catch((e) => {
        if (from === 'weather') setError(e instanceof Error ? e.message : '定位失败，仍用上海中心');
      })
      .finally(() => setLocating(false));
  }, []);

  useEffect(() => {
    if (splash) return;
    locate('weather');
  }, [splash, locate]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void hydrateSupabaseConfig().then(() => {
      if (cancelled) return;
      setCloudReady((n) => n + 1);
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) return;
        void pullCatches()
          .then((rows) => {
            if (!rows.length) return;
            rows.forEach((row) => persistReport(row));
            setReports(loadReports());
          })
          .catch(() => undefined);
        void hydrateLocalFromCloud().catch(() => undefined);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void pullPublicCatches()
        .then((rows) => {
          if (cancelled || !rows.length) return;
          setReports((current) => mergeReports(current, rows));
        })
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const saveReport = (input: Omit<CatchReport, 'id' | 'caughtAt' | 'source'> & { id?: string; caughtAt?: string; source?: CatchReport['source'] }) => {
    const report = createUserReport({
      ...input,
      id: input.id ?? editing?.id,
      caughtAt: input.caughtAt ?? editing?.caughtAt,
    });
    setReports(persistReport(report));
    setEditing(null);
    void (async () => {
      try {
        const published = await publishCatchImages(await publishCatchVideo(report));
        setReports(persistReport(published));
        void persistReportToServer(published);
        cloudWrite(pushCatch(published));
      } catch {
        void persistReportToServer(report);
        cloudWrite(pushCatch(report));
      }
    })();
    setMeStart('catches');
    setTab('me');
  };

  const changeTab = (next: TabId) => {
    setSheet(null);
    if (next !== 'spots') setPicking(false);
    if (next === 'spots') {
      locate('map');
      setSpotVisit((n) => n + 1);
    }
    if (next === 'publish') {
      locate('weather');
      setEditing(null);
    }
    if (next === 'me') setMeStart('home');
    setTab(next);
  };

  return (
    <div className="app-shell">
      <div className="phone">
        <div className="stage">
          <div className="map-stage" data-hidden={tab !== 'spots' ? 'true' : 'false'}>
            <CatchMap
              venues={DIANPING_VENUES}
              reviews={spotReviews}
              lat={coords.lat}
              lon={coords.lon}
              locateVisit={spotVisit}
              locating={tab === 'spots' && locating}
              visible={tab === 'spots'}
              picking={picking}
              navigateTo={navTarget}
              onNavigateDone={() => setNavTarget(null)}
              focusVenue={focusVenue}
              onFocusDone={() => setFocusVenue(null)}
              onOpenVenue={(venue) => {
                setSpotVenue(venue);
                setSpotBack(null);
                setSheet('spot');
              }}
              onOpenList={() => {
                setSpotBack(null);
                setSheet('venues');
              }}
              onPick={(lat, lon) => {
                const next = { lat, lon };
                setPick(next);
                setCoords(next);
                setPicking(false);
                setTab('publish');
              }}
            />
          </div>

          {tab === 'home' && (
            <HomeScreen
              weather={weather}
              hourly={hourly}
              loading={loading}
              error={error}
              index={index}
              advice={advice}
              locating={locating}
              targetFish={coerceFishForStyle(targetFish || advice?.targetFish[0] || '', style)}
              style={style}
              onStyleChange={(next) => {
                setStyle(next);
                setTargetFish((cur) => coerceFishForStyle(cur, next));
              }}
              onRefresh={() => void load()}
              onOpen={setSheet}
            />
          )}

          {tab === 'publish' && (
            <div className="page-scroll">
              <FishIdPanel
                lat={pick.lat}
                lon={pick.lon}
                locating={locating}
                onReport={saveReport}
              />
              <ReportForm
                key={editing?.id ?? 'new'}
                lat={pick.lat}
                lon={pick.lon}
                locating={locating}
                picking={picking}
                initial={editing}
                onTogglePick={() => {
                  setPicking((v) => !v);
                  setTab('spots');
                }}
                onSubmit={saveReport}
              />
            </div>
          )}

          {tab === 'hub' && (
            <HubScreen
              reports={reports}
              onNeedLogin={() => {
                setMeStart('auth');
                setTab('me');
              }}
              onOpenAuthor={(name) => {
                setAuthorName(name);
                setSheet('author');
              }}
              onOpenShare={(report) => {
                setShare(report);
                setSheet('catch');
              }}
              onOpenInbox={() => {
                setSheet(null);
                setMeStart('catches');
                setTab('me');
              }}
            />
          )}

          {tab === 'me' && (
            <MeScreen
              startView={meStart}
              onAuthDone={() => setMeStart('home')}
              onOpenAuthor={(name) => {
                setAuthorName(name);
                setSheet('author');
              }}
              onOpenShare={(report) => {
                setShare(report);
                setSheet('catch');
              }}
              reports={reports}
              lat={pick.lat}
              lon={pick.lon}
              onImport={(report) => {
                setReports(persistReport(report));
                void persistReportToServer(report);
                cloudWrite(pushCatch(report));
              }}
              onNavigateCatch={(report) => {
                setNavTarget({ lon: report.lon, lat: report.lat, name: report.spotName });
                setTab('spots');
              }}
              onEditCatch={(report) => {
                setEditing(report);
                setPick({ lat: report.lat, lon: report.lon });
                setTab('publish');
              }}
              onDeleteCatch={(report) => {
                if (!isOwnedCatch(report.id)) return;
                setReports((current) => mergeReports(removeReport(report.id), current.filter((row) => row.id !== report.id)));
                cloudWrite(deleteCatch(report.id));
              }}
              onOpenVenue={(venue) => {
                setSpotVenue(venue);
                setSheet('spot');
              }}
              onOpenDaily={() => setSheet('daily')}
              onLocate={() => locate('weather')}
              onRetryWeather={() => void load()}
            />
          )}

          <Sheet
            title={
              sheet === 'spot' && spotVenue
                ? spotVenue.name
                : sheet === 'author' && authorName
                  ? authorName
                  : sheet === 'guide'
                    ? `${coerceFishForStyle(targetFish || advice?.targetFish[0] || '', style)}介绍`
                    : sheet
                      ? SHEET_TITLE[sheet]
                      : ''
            }
            open={sheet != null}
            onClose={() => {
              if (sheet === 'spot' && spotBack) {
                setSheet(spotBack);
                setSpotBack(null);
                return;
              }
              setSheet(null);
              setSpotBack(null);
            }}
          >
            {sheet === 'advice' && <AdvicePanel advice={advice} />}
            {sheet === 'venues' && (
              <VenueList
                reviews={spotReviews}
                fromLat={coords.lat}
                fromLon={coords.lon}
                onOpen={(venue) => {
                  setSpotVenue(venue);
                  setSpotBack('venues');
                  setSheet('spot');
                }}
                onFocus={(venue) => {
                  setSpotVenue(venue);
                  setFocusVenue(venue);
                  setSpotBack(null);
                  setTab('spots');
                  setSheet('spot');
                }}
              />
            )}
            {sheet === 'daily' && (
              <DailyReport
                onImported={() => {
                  void loadServerReports().then((extra) => {
                    if (!extra.length) return;
                    setReports((current) => mergeReports(current, extra));
                  });
                }}
              />
            )}
            {sheet === 'share' && (
              <ShareImport
                lat={pick.lat}
                lon={pick.lon}
                onImport={(report) => {
                  setReports(persistReport(report));
                  void persistReportToServer(report);
                  cloudWrite(pushCatch(report));
                }}
              />
            )}
            {sheet === 'weather' && (
              <WeatherPanel weather={weather} hourly={hourly} daily={daily} loading={loading} error={error} onRetry={load} onLocate={() => locate('weather')} />
            )}
            {sheet === 'target' && (
              <TargetFishSheet
                current={coerceFishForStyle(targetFish || advice?.targetFish[0] || '', style)}
                style={style}
                onPick={(name) => {
                  setTargetFish(name);
                  setSheet(null);
                }}
              />
            )}
            {sheet === 'guide' && (
              <FishGuidePanel
                fish={coerceFishForStyle(targetFish || advice?.targetFish[0] || '', style)}
                style={style}
              />
            )}
            {sheet === 'catch' && share && (
              <CatchShareDetail
                report={share}
                onGoSpot={() => {
                  setSheet(null);
                  setNavTarget({ lon: share.lon, lat: share.lat, name: share.spotName });
                  setTab('spots');
                }}
                onOpenAuthor={(name) => {
                  setAuthorName(name);
                  setSheet('author');
                }}
                onNeedLogin={() => {
                  setMeStart('auth');
                  setTab('me');
                }}
              />
            )}
            {sheet === 'author' && authorName ? (
              <AuthorProfile
                name={authorName}
                reports={reports}
                onOpenCatch={(report) => {
                  setShare(report);
                  setSheet('catch');
                }}
              />
            ) : null}
            {sheet === 'spot' && spotVenue && (
              <VenueDetail
                venue={spotVenue}
                reviews={spotReviews}
                reports={reports}
                fromLat={coords.lat}
                fromLon={coords.lon}
                onReviewsChange={setSpotReviews}
                onPreviewRoute={() => {
                  setNavTarget({ lon: spotVenue.lon, lat: spotVenue.lat, name: spotVenue.name });
                  setSheet(null);
                  setTab('spots');
                }}
                onOpenVenue={(venue) => {
                  setSpotVenue(venue);
                }}
              />
            )}
          </Sheet>
        </div>
        <BottomNav tab={tab} onChange={changeTab} hubUnread={hubUnread} />
        {splash ? <Splash onDone={() => setSplash(false)} /> : null}
      </div>
    </div>
  );
}
