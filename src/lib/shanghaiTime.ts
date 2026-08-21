/** 渔见一律按上海东八区钟点，不跟运行环境本地时区。中国无夏令时。 */

const TZ = 'Asia/Shanghai';

export type ShanghaiParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function shanghaiParts(at: Date): ShanghaiParts {
  const bag = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

export function shanghaiHour(at: Date): number {
  return shanghaiParts(at).hour;
}

export function shanghaiMonth(at: Date): number {
  return shanghaiParts(at).month;
}

export function shanghaiWallDate(base: Date, hour: number, dayOffset = 0): Date {
  const p = shanghaiParts(base);
  const start = new Date(`${p.year}-${pad(p.month)}-${pad(p.day)}T00:00:00+08:00`).getTime();
  return new Date(start + dayOffset * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000);
}

/** Open-Meteo `timezone=Asia/Shanghai` 的无时区串按东八区读；已带偏移的 ISO 原样解析。 */
export function parseShanghaiClock(at: string): number {
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(at)) return new Date(at).getTime();
  const hit = at.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/);
  if (!hit) return new Date(at).getTime();
  return new Date(`${hit[1]}T${hit[2]}:${hit[3] ?? '00'}+08:00`).getTime();
}
