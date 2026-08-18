export function reportSpotName(raw: string): string | null {
  const text = raw.trim();
  return text ? text : null;
}
