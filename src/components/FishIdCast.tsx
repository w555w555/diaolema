import logoUrl from '../assets/logo.svg?url';

type Props = {
  phase: 'scan' | 'done';
};

export function FishIdCast({ phase }: Props) {
  const straining = phase === 'scan';
  return (
    <svg className="fish-id-cast" viewBox="0 0 260 200" data-phase={phase} aria-hidden>
      <defs>
        <linearGradient id="castWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2fc7a0" stopOpacity="0.22" />
          <stop offset="1" stopColor="#0b1413" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="castSkin" x1="48" y1="48" x2="90" y2="100">
          <stop offset="0" stopColor="#f6e2cc" />
          <stop offset="1" stopColor="#e2bc98" />
        </linearGradient>
        <linearGradient id="castCloth" x1="36" y1="88" x2="90" y2="150">
          <stop offset="0" stopColor="#3d5852" />
          <stop offset="1" stopColor="#1c2c28" />
        </linearGradient>
        <linearGradient id="castHat" x1="36" y1="18" x2="92" y2="58">
          <stop offset="0" stopColor="#f0c56a" />
          <stop offset="1" stopColor="#c9922e" />
        </linearGradient>
      </defs>
      <path className="cast-water" d="M0 142 C 50 134 90 150 140 144 C 186 138 220 148 260 140 L 260 200 L 0 200 Z" />
      <path className="cast-wave" d="M0 146 C 40 138 80 154 130 146 C 176 140 214 152 260 144" />
      <path className="cast-rock" d="M18 150 C22 138 34 132 52 134 C68 136 78 144 80 152 C62 158 32 158 18 150Z" />
      <g className="cast-angler">
        <path className="cast-pant" d="M40 124 C38 132 32 140 28 148 C32 150 38 148 42 142 L46 128 Z" />
        <path className="cast-pant" d="M54 126 C58 134 64 140 72 146 C76 148 78 152 72 152 C64 150 56 142 52 134 Z" />
        <path className="cast-boot" d="M24 146 C24 143 28 142 34 144 L38 148 C34 152 22 152 24 146Z" />
        <path className="cast-boot" d="M68 146 C70 142 76 142 82 146 C82 151 70 152 68 146Z" />
        <path className="cast-jacket" d="M40 92 C42 82 50 78 58 82 C66 88 68 100 64 118 C60 128 48 132 40 126 C34 118 36 100 40 92Z" />
        <path className="cast-arm" d="M58 94 C66 90 74 82 84 74 C86 76 84 80 80 84 C72 90 64 98 58 102 Z" />
        <circle className="cast-hand" cx="82" cy="76" r="5" />
        <ellipse className="cast-ear" cx="48" cy="74" rx="5" ry="7" />
        <circle className="cast-head" cx="64" cy="70" r="22" />
        <ellipse className="cast-blush" cx="54" cy="78" rx="5" ry="3.2" />
        <ellipse className="cast-blush" cx="76" cy="78" rx="5" ry="3.2" />
        {straining ? (
          <g className="cast-face-strain">
            <path className="cast-brow" d="M52 62 Q 58 66 64 62" />
            <path className="cast-brow" d="M78 62 Q 72 66 66 62" />
            <path className="cast-eye" d="M54 72 Q 58 76 62 72" />
            <path className="cast-eye" d="M68 72 Q 72 76 76 72" />
            <path className="cast-mouth" d="M58 84 Q 64 88 72 84" />
          </g>
        ) : (
          <g className="cast-face-win">
            <path className="cast-brow" d="M52 62 Q 58 58 64 62" />
            <path className="cast-brow" d="M78 62 Q 72 58 66 62" />
            <path className="cast-eye" d="M54 72 Q 58 76 62 72" />
            <path className="cast-eye" d="M68 72 Q 72 76 76 72" />
            <path className="cast-mouth" d="M57 84 Q 64 92 73 84" />
          </g>
        )}
        <g className="cast-hat-fly">
          <path className="cast-hat" d="M40 52 L64 28 L88 52 C76 58 52 58 40 52Z" />
          <path className="cast-hat-band" d="M46 50 C56 56 74 56 82 50 L80 52 C72 56 54 56 46 52 Z" />
        </g>
      </g>
      {straining ? (
        <g className="cast-shout">
          <path className="cast-burst" d="M118 28 L132 22 L136 36 L150 32 L144 46 L158 52 L140 58 L144 72 L128 62 L118 74 L114 58 L98 62 L110 48 L96 40 Z" />
          <text x="126" y="50" textAnchor="middle">
            嘿呀
          </text>
        </g>
      ) : null}
      <g className="cast-gear">
        <path className="cast-rod" d="M82 76 L168 36" />
        <circle className="cast-reel" cx="90" cy="72" r="3.4" />
        <path className="cast-line" d="M168 36 Q 188 88 174 138" />
      </g>
      <g className="cast-catch">
        <image href={logoUrl} x="152" y="118" width="44" height="44" />
        {phase === 'done' ? (
          <g className="cast-ok">
            <circle cx="198" cy="128" r="9" />
            <path d="M194 128 L197 131 L203 124" />
          </g>
        ) : null}
      </g>
    </svg>
  );
}
