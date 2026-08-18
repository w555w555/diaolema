import { useCallback, useEffect, useRef, useState } from 'react';
import logoUrl from '../assets/logo.svg?url';

type Props = {
  onDone: () => void;
};

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
    const timer = window.setTimeout(finish, 2600);
    return () => window.clearTimeout(timer);
  }, [finish]);

  return (
    <button
      type="button"
      className="splash"
      data-leaving={leaving ? 'true' : 'false'}
      onClick={finish}
      aria-label="进入渔见"
    >
      <span className="splash-orb splash-orb-teal" aria-hidden />
      <span className="splash-orb splash-orb-gold" aria-hidden />
      <svg className="splash-waves" viewBox="0 0 390 120" aria-hidden>
        <path d="M-20 48 C60 18, 120 18, 190 48 C260 78, 318 78, 420 36" fill="none" stroke="#2FC7A0" strokeWidth="2.5" opacity="0.22" />
        <path d="M-24 72 C70 42, 140 46, 214 76 C288 106, 340 98, 430 64" fill="none" stroke="#E8B24A" strokeWidth="1.8" opacity="0.18" />
      </svg>
      <span className="splash-mark">
        <span className="splash-halo" aria-hidden />
        <img src={logoUrl} alt="" width={216} height={216} />
      </span>
      <span className="splash-hint">轻触进入</span>
    </button>
  );
}
