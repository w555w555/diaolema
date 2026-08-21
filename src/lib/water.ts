/**
 * 水域类型 + 水色 + 收费塘保养：编译自国内公开钓技，运行时不联网。
 * 水色：渔钓者《不同水质的钓鱼用饵技巧》、渔夫谷肥瘦用饵、钓鱼人必看观水色。
 * 塘保养：钓鱼人网黑坑酱层/肥水、未侗钓鱼网换水调水开口区间。
 * 路亚色：渔钓者加州鲈、国内通例清水自然 / 浊水红头金。
 * 不编造溶氧 mg/L、透明度厘米、药残数字；不做斤塘放鱼时刻。
 */
import type { PondCare, WaterColor, WaterKind } from '../types';
import { windScale } from './windScale';

export type WaterQuery = {
  waterKind?: WaterKind;
  waterColor?: WaterColor;
  pondCare?: PondCare;
};

export type NormalizedWater = {
  waterKind: WaterKind;
  waterColor: WaterColor;
  pondCare: PondCare;
};

export const WATER_KINDS: WaterKind[] = ['公园浅湖', '大水面', '收费塘', '路亚塘', '内河', '河口'];
export const WATER_COLORS: WaterColor[] = ['未知', '瘦清', '黄绿', '肥浊', '泥浆', '恶水'];
export const POND_CARES: PondCare[] = ['未知', '刚换水', '换水回稳', '刚调水消毒', '老水'];

export const WATER_KIND_CHIPS: { id: WaterKind; label: string }[] = [
  { id: '公园浅湖', label: '公园湖' },
  { id: '大水面', label: '大水面' },
  { id: '收费塘', label: '收费塘' },
  { id: '路亚塘', label: '路亚塘' },
  { id: '内河', label: '内河' },
  { id: '河口', label: '河口' },
];

export const WATER_COLOR_CHIPS: { id: WaterColor; label: string }[] = [
  { id: '未知', label: '未知' },
  { id: '瘦清', label: '瘦清' },
  { id: '黄绿', label: '黄绿' },
  { id: '肥浊', label: '肥水' },
  { id: '泥浆', label: '泥浆' },
  { id: '恶水', label: '恶水' },
];

export const POND_CARE_CHIPS: { id: PondCare; label: string }[] = [
  { id: '未知', label: '保养未知' },
  { id: '刚换水', label: '刚换水' },
  { id: '换水回稳', label: '回稳' },
  { id: '刚调水消毒', label: '刚调水' },
  { id: '老水', label: '老水' },
];

export function isPondWater(kind: WaterKind): boolean {
  return kind === '收费塘' || kind === '路亚塘';
}

export function venueToWaterKind(venue: { kind: string; name?: string }): WaterKind {
  const hay = `${venue.name ?? ''} ${venue.kind}`;
  if (/海钓|海湾|南汇嘴|城市沙滩/.test(hay)) return '河口';
  if (/淀山湖|滴水湖|大莲湖|崇明北湖|明珠湖/.test(hay)) return '大水面';
  if (/路亚/.test(hay)) return '路亚塘';
  if (/垂钓|鱼塘|生态园|钓虾|钓鱼营地|池塘|休闲钓/.test(hay)) return '收费塘';
  if (/公园/.test(hay)) return '公园浅湖';
  if (/河|浜|浦|内河/.test(hay)) return '内河';
  return '收费塘';
}

export function normalizeWater(query: WaterQuery = {}): NormalizedWater {
  const waterKind = WATER_KINDS.includes(query.waterKind as WaterKind) ? (query.waterKind as WaterKind) : '公园浅湖';
  const waterColor = WATER_COLORS.includes(query.waterColor as WaterColor) ? (query.waterColor as WaterColor) : '未知';
  const requestedCare = POND_CARES.includes(query.pondCare as PondCare) ? (query.pondCare as PondCare) : '未知';
  return {
    waterKind,
    waterColor,
    pondCare: isPondWater(waterKind) ? requestedCare : '未知',
  };
}

export function waterColorDelta(
  color: WaterColor,
  extras: { summer?: boolean; windKmh?: number } = {},
): { delta: number; reasons: string[]; cap?: number } {
  const reasons: string[] = [];
  let delta = 0;
  let cap: number | undefined;

  if (color === '黄绿') {
    delta = 6;
    reasons.push('水色黄绿较亮，中肥且鱼可消化浮游植物，按国内经验最好开口');
  } else if (color === '瘦清') {
    delta = 0;
    reasons.push('水色瘦清，溶氧往往够但鱼稀、偏警惕，饵偏腥香');
  } else if (color === '肥浊') {
    delta = -6;
    reasons.push('水色肥浊，食物多、口偏挑，宜本味清淡、细线');
    if (extras.summer && windScale(extras.windKmh ?? 10) <= 1) {
      delta -= 4;
      reasons.push('盛夏肥水又无风，更容易闷、口更差');
    }
  } else if (color === '泥浆') {
    delta = -10;
    reasons.push('水色泥浆，能见度极低，口差；路亚贴结构、高对比');
  } else if (color === '恶水') {
    delta = -28;
    cap = 34;
    reasons.push('水色黑褐、水华或有异味，按国内经验不宜强求');
  }

  return { delta, reasons, cap };
}

export function pondCareDelta(kind: WaterKind, care: PondCare): { delta: number; reasons: string[] } {
  if (!isPondWater(kind) || care === '未知') return { delta: 0, reasons: [] };

  if (care === '刚换水') {
    return { delta: -12, reasons: ['收费塘刚换水（当天到约 1 天），鱼应激、口差'] };
  }
  if (care === '刚调水消毒') {
    return { delta: -10, reasons: ['刚调水或消毒后约 2–5 天，口往往不稳'] };
  }
  if (care === '换水回稳') {
    return { delta: 4, reasons: ['换水已回稳（约 2–3 天），相对容易回口'] };
  }
  return { delta: -4, reasons: ['老水塘底常有酱层，饵易陷，宜略离底、减轻比重'] };
}

export function applyWaterIndex(
  score: number,
  reasons: string[],
  query: WaterQuery,
  extras: { summer?: boolean; windKmh?: number } = {},
): { score: number; reasons: string[] } {
  const water = normalizeWater(query);
  const color = waterColorDelta(water.waterColor, extras);
  const care = pondCareDelta(water.waterKind, water.pondCare);
  let next = score + color.delta + care.delta;
  const extra = [...color.reasons, ...care.reasons];
  if (color.cap != null) next = Math.min(next, color.cap);
  return { score: next, reasons: extra.length ? [...extra, ...reasons] : reasons };
}

export function waterFlavorOverride(base: string, water: NormalizedWater): string {
  let flavor = base;
  if (water.waterColor === '瘦清' && flavor !== '大腥') {
    if (flavor === '本味清淡' || flavor === '清香' || flavor === '清淡带果酸') flavor = '腥香';
  }
  if (water.waterColor === '肥浊' || water.waterColor === '泥浆') {
    if (flavor === '大腥' || flavor === '腥香') flavor = '本味清淡';
    else if (flavor === '香腥') flavor = '粮食清香';
  }
  if (water.pondCare === '刚换水' || water.pondCare === '刚调水消毒') {
    flavor = '清淡轻口';
  }
  return flavor;
}

export function waterLureColor(water: NormalizedWater, raining: boolean, night: boolean): string | null {
  if (water.waterColor === '泥浆' || water.waterColor === '肥浊') return raining ? '红头/金色' : '红头金/高对比';
  if (water.waterColor === '瘦清') return night ? '暗色近岸' : '银白自然色';
  if (water.waterColor === '黄绿') return raining ? '红头白身' : '银白或略艳';
  return null;
}

export function waterAdviceNotes(water: NormalizedWater): string[] {
  const notes: string[] = [];
  if (water.waterKind === '收费塘') {
    notes.push('收费塘不按野河硬套；看水色与塘保养，不编造放鱼时刻');
  } else if (water.waterKind === '路亚塘') {
    notes.push('路亚塘主攻结构区加州鲈，近岸轻荡，浊水贴障碍');
  } else if (water.waterKind === '大水面') {
    notes.push('大水面翘嘴夏天可加到 7–12g，不必死守浅湖克数');
  } else if (water.waterKind === '河口') {
    notes.push('河口花鲈/鲻走潮沟闸口，塘鲈标点不要硬套过来');
  }

  if (water.waterColor === '黄绿') notes.push('黄绿中肥口相对最好，台钓香或淡腥，路亚银白或略艳');
  if (water.waterColor === '瘦清') notes.push('瘦清偏腥或腥香，路亚银白自然、近岸暗色');
  if (water.waterColor === '肥浊') notes.push('肥浊用本味清淡或粮食香，细线，路亚红头金并贴结构');
  if (water.waterColor === '泥浆') notes.push('泥浆口差，路亚高对比或加震、贴障碍多抛');
  if (water.waterColor === '恶水') notes.push('恶水（黑褐、水华、异味）不宜强求');

  if (water.pondCare === '刚换水') notes.push('刚换水应激口差，软粘轻口，不要抽散炮');
  if (water.pondCare === '刚调水消毒') notes.push('刚调水消毒后口不稳，轻口软粘，等回稳再正常打');
  if (water.pondCare === '换水回稳') notes.push('换水回稳后相对好开口');
  if (water.pondCare === '老水') notes.push('老水酱层，略离底、饵料减轻比重');
  return notes;
}
