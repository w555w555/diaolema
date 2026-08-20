import { catchMediaBadge } from '../lib/catchMedia';
import type { CatchReport } from '../types';

export function CatchMediaBadge({ report }: { report: CatchReport }) {
  const badge = catchMediaBadge(report);
  if (!badge) return null;
  if (badge.kind === 'video') {
    return (
      <span className="share-media-badge" aria-label="短视频">
        ▶
      </span>
    );
  }
  return (
    <span className="share-media-badge" aria-label={`${badge.count}张图`}>
      {badge.count}
    </span>
  );
}
