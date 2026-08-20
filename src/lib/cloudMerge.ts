export function unionNames(local: Iterable<string>, remote: Iterable<string> = []): string[] {
  const next: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...local, ...remote]) {
    const name = String(raw ?? '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    next.push(name);
  }
  return next;
}

export function mergeAllowMap(
  local: Record<string, boolean>,
  remote: Record<string, boolean>,
): Record<string, boolean> {
  return { ...remote, ...local };
}
