import { useState, useSyncExternalStore } from 'react';
import { loadProfile } from '../lib/meProfile';
import { cloudWrite, pushBlock, pushReport } from '../lib/userCloud';
import {
  REPORT_REASONS,
  blockAuthor,
  getSafety,
  reportAuthor,
  subscribeSafety,
  unblockAuthor,
} from '../lib/userSafety';

export function SafetyActions({ name }: { name: string }) {
  const me = loadProfile().name;
  const safety = useSyncExternalStore(subscribeSafety, getSafety, getSafety);
  const [reportOpen, setReportOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const author = name.trim();
  if (!author || author === me.trim()) return null;
  const blocked = safety.blocks.includes(author);

  return (
    <div className="safety-actions">
      <div className="safety-actions-row">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            if (blocked) {
              unblockAuthor(author);
              cloudWrite(pushBlock(author, false));
              setHint('已解除拉黑');
              return;
            }
            blockAuthor(author, me);
            cloudWrite(pushBlock(author, true));
            setHint('已拉黑，不再看他的渔获和私聊');
          }}
        >
          {blocked ? '解除拉黑' : '拉黑'}
        </button>
        <button type="button" className="ghost" onClick={() => setReportOpen((open) => !open)}>
          举报
        </button>
      </div>
      {reportOpen ? (
        <div className="safety-reasons">
          {REPORT_REASONS.map((row) => (
            <button
              key={row.id}
              type="button"
              className="ghost"
              onClick={() => {
                reportAuthor(author, row.id);
                cloudWrite(pushReport(author, row.id));
                setReportOpen(false);
                setHint('已收到举报');
              }}
            >
              {row.label}
            </button>
          ))}
        </div>
      ) : null}
      {hint ? <p className="muted">{hint}</p> : null}
    </div>
  );
}
