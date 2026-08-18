import { useEffect, useRef, useState } from 'react';
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
  const [agentUrl, setAgentUrl] = useState('https://www.doubao.com');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FishIdResult | null>(null);
  const [picked, setPicked] = useState<string>('');
  const [spotName, setSpotName] = useState('当前位置');

  useEffect(() => {
    void fetchFishIdStatus().then((s) => {
      setConfigured(s.configured);
      if (s.agentUrl) setAgentUrl(s.agentUrl);
    });
  }, []);

  const runIdentify = async (file: File) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
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
    } catch (e) {
      if (controller.signal.aborted) return;
      const message = e instanceof Error ? e.message : String(e);
      if (message === 'not_configured' || (e instanceof Error && e.name === 'FishIdNotConfigured')) {
        setConfigured(false);
        setError('还没配豆包 API Key，可先手选鱼种。');
      } else if (/aborted due to timeout/i.test(message) || (e instanceof Error && e.name === 'TimeoutError')) {
        setError('豆包识图超时，请换一张更小的鱼照再试。');
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
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

  return (
    <section className="panel report-form fish-id-panel">
      <h2>AI 识鱼</h2>
      <p className="muted legal">
        手机点拍照用后置相机，再把图发给豆包识图。不能自动登录网页版填表。
        <a href={agentUrl} target="_blank" rel="noreferrer">
          打开豆包
        </a>
      </p>
      {configured === false && (
        <p className="muted">还没配豆包 API Key。可先手选鱼种，或到火山方舟控制台申请密钥后发给我。</p>
      )}
      <div className="fish-id-actions">
        <PhotoCapture onPick={(file) => void runIdentify(file)} />
        {busy && (
          <button
            type="button"
            className="ghost"
            onClick={() => {
              abortRef.current?.abort();
              setBusy(false);
            }}
          >
            取消
          </button>
        )}
      </div>
      {preview && <img className="fish-id-preview" src={preview} alt="渔获预览" />}
      {busy && <p className="muted">正在识别…</p>}
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
      {uncertain && fishName && fishName !== UNCERTAIN && <p className="muted">置信度偏低，请核对后再上报。</p>}
    </section>
  );
}
