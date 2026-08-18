import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdvicePanel } from './components/AdvicePanel';
import { BottomNav, type TabId } from './components/BottomNav';
import { CatchMap } from './components/CatchMap';
import { DailyReport } from './components/DailyReport';
import { FishIdPanel } from './components/FishIdPanel';
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
import { createUserReport, loadReports, loadServerReports, mergeReports, persistReport, persistReportToServer } from './lib/intel';
import { requestCurrentPosition } from './lib/geo';
import { DIANPING_VENUES } from './lib/venues';
import { loadSpotReviews } from './lib/spotReviews';
import { coerceFishForStyle } from './lib/fishId/catalog';
import { fetchWeather } from './lib/weather';
import { SHANGHAI_CENTER, type CatchReport, type FishIdResult, type FishStyle, type FishingVenue, type SpotReview, type WeatherSnapshot } from './types';
import './index.css';

const SHEET_TITLE: Record<HomeSheet, string> = {
  fishid: '识鱼入护',
  advice: '今日怎么钓',
  venues: '钓场排行',
  daily: '鱼情日报',
  share: '分享入库',
  weather: '实时天气',
  target: '更换目标鱼',
  guide: '鱼类介绍',
  catch: '渔获分享',
  spot: '钓点详情',
};

export function App() {
  const [tab, setTab] = useState<TabId>('home');
  const [sheet, setSheet] = useState<HomeSheet | null>(null);
  const [coords, setCoords] = useState(SHANGHAI_CENTER);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<CatchReport[]>(() => loadReports());
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState(SHANGHAI_CENTER);
  const [navTarget, setNavTarget] = useState<{ lon: number; lat: number; name: string } | null>(null);
  const [focusVenue, setFocusVenue] = useState<FishingVenue | null>(null);
  const [lastId, setLastId] = useState<FishIdResult | null>(null);
  const [targetFish, setTargetFish] = useState('');
  const [style, setStyle] = useState<FishStyle>('台钓');
  const [share, setShare] = useState<CatchReport | null>(null);
  const [splash, setSplash] = useState(true);
  const [spotReviews, setSpotReviews] = useState<SpotReview[]>(() => loadSpotReviews());
  const [spotVisit, setSpotVisit] = useState(0);
  const [locating, setLocating] = useState(false);
  const [spotVenue, setSpotVenue] = useState<FishingVenue | null>(null);
  const [meStart, setMeStart] = useState<'home' | 'catches'>('home');
  const [spotBack, setSpotBack] = useState<HomeSheet | null>(null);
  const [fishPhoto, setFishPhoto] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await fetchWeather(coords.lat, coords.lon);
      setWeather(snap);
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

  const saveReport = (input: Omit<CatchReport, 'id' | 'caughtAt' | 'source'> & { source?: CatchReport['source'] }) => {
    const report = createUserReport(input);
    setReports(persistReport(report));
    void persistReportToServer(report);
  };

  const goSpots = () => {
    setSheet(null);
    setTab('spots');
  };

  const changeTab = (next: TabId) => {
    setSheet(null);
    if (next !== 'spots') setPicking(false);
    if (next === 'spots') {
      locate('map');
      setSpotVisit((n) => n + 1);
    }
    if (next === 'publish') locate('weather');
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
                setPick({ lat, lon });
                setPicking(false);
                setTab('publish');
              }}
            />
          </div>

          {tab === 'home' && (
            <HomeScreen
              weather={weather}
              loading={loading}
              error={error}
              index={index}
              advice={advice}
              lastId={lastId}
              locating={locating}
              targetFish={coerceFishForStyle(targetFish || advice?.targetFish[0] || '', style)}
              style={style}
              onStyleChange={(next) => {
                setStyle(next);
                setTargetFish((cur) => coerceFishForStyle(cur, next));
              }}
              onRefresh={() => void load()}
              onOpen={setSheet}
              reports={reports}
              onOpenInbox={() => {
                setSheet(null);
                setMeStart('catches');
                setTab('me');
              }}
              onOpenShare={(report) => {
                setShare(report);
                setSheet('catch');
              }}
              onFishPhoto={(file) => {
                setFishPhoto(file);
                setSheet('fishid');
              }}
            />
          )}

          {tab === 'publish' && (
            <div className="page-scroll">
              <FishIdPanel
                lat={pick.lat}
                lon={pick.lon}
                locating={locating}
                onReport={saveReport}
                onIdentified={setLastId}
              />
              <ReportForm
                lat={pick.lat}
                lon={pick.lon}
                locating={locating}
                picking={picking}
                onTogglePick={() => {
                  setPicking((v) => !v);
                  setTab('spots');
                }}
                onSubmit={saveReport}
              />
            </div>
          )}

          {tab === 'hub' && <HubScreen />}

          {tab === 'me' && (
            <MeScreen
              key={meStart}
              startView={meStart}
              reports={reports}
              lat={pick.lat}
              lon={pick.lon}
              onImport={(report) => {
                setReports(persistReport(report));
                void persistReportToServer(report);
              }}
              onNavigateCatch={(report) => {
                setNavTarget({ lon: report.lon, lat: report.lat, name: report.spotName });
                setTab('spots');
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
            {sheet === 'fishid' && (
              <FishIdPanel
                lat={pick.lat}
                lon={pick.lon}
                locating={locating}
                initialFile={fishPhoto}
                onInitialConsumed={() => setFishPhoto(null)}
                onReport={saveReport}
                onIdentified={setLastId}
              />
            )}
            {sheet === 'advice' && <AdvicePanel advice={advice} />}
            {sheet === 'venues' && (
              <VenueList
                reviews={spotReviews}
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
                onNavigate={(venue) => {
                  setNavTarget({ lon: venue.lon, lat: venue.lat, name: venue.name });
                  goSpots();
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
                }}
              />
            )}
            {sheet === 'weather' && (
              <WeatherPanel weather={weather} loading={loading} error={error} onRetry={load} onLocate={() => locate('weather')} />
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
              />
            )}
            {sheet === 'spot' && spotVenue && (
              <VenueDetail
                venue={spotVenue}
                reviews={spotReviews}
                reports={reports}
                onReviewsChange={setSpotReviews}
                onNavigate={() => {
                  setNavTarget({ lon: spotVenue.lon, lat: spotVenue.lat, name: spotVenue.name });
                  setSheet(null);
                  setTab('spots');
                }}
              />
            )}
          </Sheet>
        </div>
        <BottomNav tab={tab} onChange={changeTab} />
        {splash ? <Splash onDone={() => setSplash(false)} /> : null}
      </div>
    </div>
  );
}
