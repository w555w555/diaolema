import { useCallback, useEffect, useRef, useState } from 'react';
import logoUrl from '../assets/logo.svg?url';
import { BRAND_NAME, MANIFESTO } from '../lib/brand';

type Props = {
  onDone: () => void;
};

const AUTO_MS = 4200;

function couplet(line: string) {
  const comma = line.indexOf('，');
  if (comma < 0) return line;
  return (
    <>
      {line.slice(0, comma + 1)}
      <br />
      {line.slice(comma + 1)}
    </>
  );
}

export function Splash({ onDone }: Props) {
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setLeaving(true);
    window.setTimeout(onDone, 420);
  }, [onDone]);

  useEffect(() => {
    const timer = window.setTimeout(finish, AUTO_MS);
    return () => window.clearTimeout(timer);
  }, [finish]);

  return (
    <button
      type="button"
      className="splash"
      data-leaving={leaving ? 'true' : 'false'}
      onClick={finish}
      aria-label={`进入${BRAND_NAME}`}
    >
      <span className="splash-mark">
        <img src={logoUrl} alt="" width={72} height={72} />
      </span>
      <strong className="splash-title">{BRAND_NAME}</strong>
      <blockquote className="splash-manifesto">
        <p>{couplet(MANIFESTO[0])}</p>
        <p>{couplet(MANIFESTO[1])}</p>
      </blockquote>
      <span className="splash-enter">进入</span>
      <span className="splash-hint">轻触继续</span>
    </button>
  );
}
