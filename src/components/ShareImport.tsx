import { useState } from 'react';
import { parseShareText } from '../lib/parseShare';
import type { CatchReport } from '../types';

type Props = {
  lat: number;
  lon: number;
  onImport: (report: CatchReport) => void;
};

export function ShareImport({ lat, lon, onImport }: Props) {
  const [text, setText] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="panel report-form"
      onSubmit={(e) => {
        e.preventDefault();
        const raw = text.trim();
        if (!raw) return;
        setBusy(true);
        setHint('正在按 save_post 流水线入库…');
        void (async () => {
          try {
            const res = await fetch('/api/ingest', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ snippet: raw, selected_location: '上海' }),
            });
            if (res.ok) {
              const data = (await res.json()) as { inserted?: boolean; report?: CatchReport | null };
              if (data.report) {
                onImport(data.report);
                setText('');
                setHint(
                  data.inserted
                    ? `已入库：${data.report.author} 钓到了${data.report.fish}`
                    : `这条链接已经在库里：${data.report.author} 钓到了${data.report.fish}`,
                );
                return;
              }
            }
          } catch {
            // fall through to local parse
          }

          const parsed = parseShareText(raw, { lon, lat });
          if (!parsed) {
            setHint('没读出鱼种。请带上鱼名，例如：小红书 阿周 3小时前在滴水湖钓到了鲈鱼');
            return;
          }
          onImport({
            id: `share-${Date.now()}`,
            author: parsed.author,
            fish: parsed.fish,
            spotName: parsed.spotName,
            lon: parsed.lon,
            lat: parsed.lat,
            source: parsed.source,
            note: parsed.note,
            sourceUrl: parsed.sourceUrl,
            caughtAt: new Date(Date.now() - parsed.hoursAgo * 3600 * 1000).toISOString(),
          });
          setText('');
          setHint(
            `已入库：${parsed.author} ${parsed.hoursAgo < 1 ? '刚刚' : `${Math.round(parsed.hoursAgo)}小时前`} 钓到了${parsed.fish}`,
          );
        })().finally(() => setBusy(false));
      }}
    >
      <h2>小红书 / 抖音 / 公众号鱼情</h2>
      <p className="muted legal">
        把小红书、抖音、微博、微信公众号的分享文案或链接贴进来，识别后写入飞书多维表，并钉到地图。不能自动登录这些平台去全站抓取。
      </p>
      <label>
        粘贴分享
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' })}
          rows={4}
          disabled={busy}
          placeholder="例：路亚阿周发布了一篇小红书笔记：3小时前在滴水湖钓到了鲈鱼"
        />
      </label>
      {hint && <p className="muted">{hint}</p>}
      <button type="submit" disabled={busy}>
        {busy ? '入库中…' : '解析并钉到地图'}
      </button>
    </form>
  );
}
