/**
 * 晨昏窗口倒计时，与 climateFlags.prime 同一套钟点。
 * 晨间窗口 05:00–08:00，黄昏窗口 17:00–20:00。运行时不联网。
 */

export type WindowName = '晨间窗口' | '黄昏窗口';
export type WindowPhase = 'in' | 'wait';

export type WindowCountdown = {
  phase: WindowPhase;
  name: WindowName;
  title: string;
  remainMs: number;
  remainText: string;
};

function atHour(base: Date, hour: number, dayOffset = 0): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function formatRemain(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function windowCountdown(at: Date): WindowCountdown {
  const morningStart = atHour(at, 5);
  const morningEnd = atHour(at, 8);
  const eveningStart = atHour(at, 17);
  const eveningEnd = atHour(at, 20);

  if (at >= morningStart && at < morningEnd) {
    return make('in', '晨间窗口', morningEnd, at);
  }
  if (at >= eveningStart && at < eveningEnd) {
    return make('in', '黄昏窗口', eveningEnd, at);
  }
  if (at < morningStart) {
    return make('wait', '晨间窗口', morningStart, at);
  }
  if (at < eveningStart) {
    return make('wait', '黄昏窗口', eveningStart, at);
  }
  return make('wait', '晨间窗口', atHour(at, 5, 1), at);
}

function make(phase: WindowPhase, name: WindowName, target: Date, at: Date): WindowCountdown {
  const remainMs = Math.max(0, target.getTime() - at.getTime());
  return {
    phase,
    name,
    title: phase === 'in' ? `${name}剩余` : `距${name}`,
    remainMs,
    remainText: formatRemain(remainMs),
  };
}
