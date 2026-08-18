import { useEffect, useState } from 'react';

type Daily = {
  date?: string | null;
  markdown?: string;
  path?: string;
  inserted?: number;
  discovered?: number;
  fetched_body?: number;
  snippet_only?: number;
};

type Props = {
  onImported?: () => void;
};

export function DailyReport({ onImported }: Props) {
  const [link, setLink] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [daily, setDaily] = useState<Daily | null>(null);

  const load = async () => {
    const res = await fetch('/api/daily-report');
    if (res.ok) setDaily((await res.json()) as Daily);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel report-form">
      <h2>鱼情日报</h2>
      <p className="muted legal">
        已启用平台：小红书、抖音、微信公众号、B站、贴吧、知乎。每天用搜索引擎公开结果发现鱼情：按城市、平台、关键词查询，保存标题/摘要/链接。公开网页（B站、贴吧）会尝试读正文；小红书、抖音、公众号、知乎只保留摘要，不登录、不绕验证码。日报在 fish_scout_data/reports。
      </p>
      <label>
        手动保存链接
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https:// 公开页或分享链接"
          disabled={busy}
        />
      </label>
      <div className="row-actions">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const raw = link.trim();
            if (!raw) return;
            setBusy(true);
            void (async () => {
              try {
                const res = await fetch('/api/manual-link', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ url: raw, snippet: raw }),
                });
                const data = (await res.json()) as { error?: string; inserted?: boolean };
                if (!res.ok) {
                  setHint(data.error || '保存失败');
                  return;
                }
                setLink('');
                setHint(data.inserted ? '链接已保存并入库' : '该链接已在库中');
                onImported?.();
                await load();
              } catch {
                setHint('保存失败');
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          保存链接
        </button>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setHint('正在按城市×平台×关键词检索公开结果…');
            void (async () => {
              try {
                const res = await fetch('/api/scout/run', { method: 'POST' });
                const data = (await res.json()) as Daily & { error?: string };
                if (!res.ok) {
                  setHint(data.error || '生成失败');
                  return;
                }
                setDaily(data);
                setHint(
                  `日报已生成：发现 ${data.discovered ?? 0} 条，新增 ${data.inserted ?? 0} 条（正文 ${data.fetched_body ?? 0} / 仅摘要 ${data.snippet_only ?? 0}）`,
                );
                onImported?.();
              } catch {
                setHint('生成失败');
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          {busy ? '整理中…' : '生成本日报'}
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => void load()}>
          查看今日
        </button>
      </div>
      {hint && <p className="muted">{hint}</p>}
      {daily?.markdown ? (
        <pre className="daily-md">{daily.markdown}</pre>
      ) : (
        <p className="muted">还没有今日日报。点「生成本日报」，或双击「每日鱼情日报.bat」。</p>
      )}
    </section>
  );
}
