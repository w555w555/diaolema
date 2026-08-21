import { useEffect, useRef, useState } from 'react';
import { FishIdCast } from './FishIdCast';
import { PhotoCapture } from './PhotoCapture';
import { FISH_CATALOG, LOW_CONFIDENCE, UNCERTAIN } from '../lib/fishId/catalog';
import { compressImageFile, fetchFishIdStatus, identifyFish } from '../lib/fishId/client';
import { packedToDataUrl } from '../lib/photo';
import type { CatchReport, FishIdResult } from '../types';

type Props = {
  lat: number;
  lon: number;
  locating?: boolean;
  initialFile?: File | null;
  onInitialConsumed?: () => void;
  onReport: (input: Omit<CatchReport, 'id' | 'caughtAt' | 'source'> & { source?: CatchReport['source'] }) => void;
  onIdentified?: (result: FishIdResult) => void;
};

export function FishIdPanel({
  lat,
  lon,
  locating,
  initialFile,
  onInitialConsumed,
  onReport,
  onIdentified,
}: Props) {
  const abortRef = useRef<AbortController | null>(null);
  const consumedRef = useRef<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [scanPhase, setScanPhase] = useState<'off' | 'scan' | 'done'>('off');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FishIdResult | null>(null);
  const [picked, setPicked] = useState<string>('');
  const [spotName, setSpotName] = useState('当前位置');

  useEffect(() => {
    void fetchFishIdStatus().then((s) => {
      setConfigured(s.configured);
    });
  }, []);

  const runIdentify = async (file: File) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setScanPhase('scan');
    setError(null);
    setResult(null);
    setPicked('');
    try {
      setPreview(URL.createObjectURL(file));
      const packed = await compressImageFile(file);
      setPhotoUrl(packedToDataUrl(packed));
      const next = await identifyFish(packed.imageBase64, packed.mime, controller.signal);
      setResult(next);
      onIdentified?.(next);
      if (next.inCatalog && next.confidence >= LOW_CONFIDENCE) setPicked(next.species);
      else if (next.alternatives[0]) setPicked(next.alternatives[0].species);
      setScanPhase('done');
      await new Promise((resolve) => window.setTimeout(resolve, 1100));
    } catch (e) {
      if (controller.signal.aborted) return;
      const message = e instanceof Error ? e.message : String(e);
      if (message === 'not_configured' || (e instanceof Error && e.name === 'FishIdNotConfigured')) {
        setConfigured(false);
        setError('还没配置识鱼密钥，可先手选鱼种。');
      } else if (/aborted due to timeout/i.test(message) || (e instanceof Error && e.name === 'TimeoutError')) {
        setError('识图超时，请换一张更小的鱼照再试。');
      } else {
        setError(message.replace(/豆包/g, '识鱼'));
      }
    } finally {
      setScanPhase('off');
    }
  };

  useEffect(() => {
    if (!initialFile || consumedRef.current === initialFile) return;
    consumedRef.current = initialFile;
    onInitialConsumed?.();
    void runIdentify(initialFile);
  }, [initialFile]);

  const fishName = picked || (result?.inCatalog ? result.species : '');
  const uncertain = !fishName || fishName === UNCERTAIN || (result != null && result.confidence < LOW_CONFIDENCE && picked === result.species);
  const cancelScan = () => {
    abortRef.current?.abort();
    setScanPhase('off');
  };

  return (
    <section className="panel report-form fish-id-panel">
      <h2>AI 识鱼</h2>
      <p className="muted legal">拍照或从相册选图，识别词表内鱼种。</p>
      {configured === false && <p className="muted">还没配置识鱼密钥，可先手选鱼种。</p>}
      <div className="fish-id-actions">
        <PhotoCapture cameraClassName="primary" onPick={(file) => void runIdentify(file)} />
      </div>
      <div className="fish-id-stage">
        {preview ? <img src={preview} alt="渔获预览" /> : <span className="fish-id-stage-empty">取景</span>}
      </div>
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="fish-id-result">
          <p className="layer">
            {result.inCatalog && result.confidence >= LOW_CONFIDENCE ? (
              <>
                这是 <strong>{result.species}</strong>
                <span className="muted"> （{(result.confidence * 100).toFixed(0)}%）</span>
              </>
            ) : (
              <>
                认不太准<strong>{result.species === UNCERTAIN ? '' : `，像 ${result.species}`}</strong>
              </>
            )}
          </p>
          {result.cues.length > 0 && (
            <ul className="reasons">
              {result.cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ul>
          )}
          {result.alternatives.length > 0 && (
            <div className="fish-id-alts">
              {result.alternatives.map((alt) => (
                <button key={alt.species} type="button" className={picked === alt.species ? 'active' : 'ghost'} onClick={() => setPicked(alt.species)}>
                  {alt.species}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="muted">词表点选</p>
      <div className="fish-id-alts catalog">
        {FISH_CATALOG.map((name) => (
          <button key={name} type="button" className={picked === name ? 'active' : 'ghost'} onClick={() => setPicked(name)}>
            {name}
          </button>
        ))}
      </div>
      <label>
        钓点
        <input value={spotName} onChange={(e) => setSpotName(e.target.value)} />
      </label>
      <p className="muted coords">{locating ? '正在定位…' : `${lat.toFixed(5)}, ${lon.toFixed(5)}`}</p>
      <button
        type="button"
        className="primary"
        disabled={!fishName || fishName === UNCERTAIN}
        onClick={() => {
          onReport({
            author: '我',
            fish: fishName,
            spotName: spotName.trim() || '当前位置',
            lon,
            lat,
            note: result?.cues[0],
            imageUrl: photoUrl,
          });
        }}
      >
        用这个鱼名上报
      </button>
      {!fishName || fishName === UNCERTAIN ? (
        <p className="muted">先拍照识鱼，或点上面词表选一个鱼种，按钮才能点。</p>
      ) : null}
      {uncertain && fishName && fishName !== UNCERTAIN && <p className="muted">置信度偏低，请核对后再上报。</p>}
      {scanPhase !== 'off' ? (
        <div className="fish-id-scan" role="status" aria-live="polite">
          <div className="fish-id-scan-card" data-phase={scanPhase}>
            {scanPhase === 'scan' ? (
              <button type="button" className="fish-id-scan-close" aria-label="取消识别" onClick={cancelScan}>
                ×
              </button>
            ) : null}
            <FishIdCast phase={scanPhase} />
            <p>{scanPhase === 'done' ? '识别完成' : '正在识别'}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
