function toSvgDataUri(svg: string): string {
  const compact = svg.replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml;base64,${btoa(compact)}`;
}

const LURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180">
  <rect width="320" height="180" fill="#0b2a32"/>
  <rect x="0" y="108" width="320" height="72" fill="#163d48"/>
  <ellipse cx="160" cy="128" rx="118" ry="28" fill="#1e6f7a"/>
  <ellipse cx="160" cy="124" rx="96" ry="18" fill="#2a8f96"/>
  <path d="M48 118 L92 70 L136 118 Z" fill="#c9a227"/>
  <path d="M70 70 L70 48 L96 56 L70 62" fill="#e8d48a"/>
  <circle cx="214" cy="118" r="7" fill="#7ee0c6"/>
  <path d="M214 118 C 240 90, 268 96, 292 72" fill="none" stroke="#e2b857" stroke-width="3"/>
  <circle cx="292" cy="72" r="4" fill="#ffb347"/>
</svg>`;

const SEA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180">
  <rect width="320" height="180" fill="#082430"/>
  <path d="M0 92 Q40 72 80 92 T160 92 T240 92 T320 92 V180 H0 Z" fill="#1a5d78"/>
  <path d="M0 118 Q50 102 100 118 T200 118 T320 118 V180 H0 Z" fill="#247a8c"/>
  <rect x="128" y="48" width="64" height="10" rx="3" fill="#d7c48a"/>
  <rect x="156" y="18" width="8" height="40" fill="#c9a227"/>
  <path d="M164 22 L210 8" stroke="#e2b857" stroke-width="3"/>
  <circle cx="210" cy="8" r="4" fill="#ffb347"/>
</svg>`;

const POND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180">
  <rect width="320" height="180" fill="#10281f"/>
  <ellipse cx="160" cy="116" rx="130" ry="40" fill="#2d6b4a"/>
  <ellipse cx="160" cy="110" rx="108" ry="28" fill="#3f8a5e"/>
  <rect x="36" y="86" width="18" height="44" fill="#8d6b3a"/>
  <circle cx="45" cy="78" r="16" fill="#3d7a3a"/>
  <rect x="266" y="90" width="16" height="40" fill="#8d6b3a"/>
  <circle cx="274" cy="82" r="14" fill="#4c8d44"/>
  <path d="M70 150 L250 150" stroke="#c9a227" stroke-width="6" stroke-linecap="round"/>
</svg>`;

const CLOSED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180">
  <rect width="320" height="180" fill="#2a2a2a"/>
  <ellipse cx="160" cy="120" rx="110" ry="30" fill="#4a4a4a"/>
  <path d="M90 50 L230 130 M230 50 L90 130" stroke="#c9a227" stroke-width="10" stroke-linecap="round"/>
</svg>`;

export function venueKindSvg(kind: string, status: string): string {
  if (status === 'closed') return CLOSED_SVG;
  if (kind.includes('海钓')) return SEA_SVG;
  if (/垂钓|鱼塘|生态园/.test(kind)) return POND_SVG;
  return LURE_SVG;
}

export function venueKindDataUri(kind: string, status: string): string {
  return toSvgDataUri(venueKindSvg(kind, status));
}
