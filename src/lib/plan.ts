/**
 * 味型 / 饵形 / 标点 / 拟饵：编译自国内教材与公开钓技，运行时不联网、不调模型。
 * 气压：钓鱼之家「升压/稳压好钓、走低口差」；渔钓者上浮为找氧。
 * 台钓：渔钓者冬春主腥、夏主清淡；低压口差加果酸。
 * 路亚克数与操法：渔夫者/钓鱼007 翘嘴冬春 12–20g、夜钓 7–10g；
 * 上海公园浅湖夏天 5–7g（小浪纹/碧溪上），淀山湖滴水湖大水面可加到 7–12g；
 * 渔钓者黑鱼雷蛙走走停停，中鱼后等两三秒再抽；酷钓鱼铅头钩 5–7g 溪流 / 7–10g 湖库；
 * 酷米网白条瓜子亮片 1.5–3g。清水银白、浊水红头金。
 * 上海路亚塘「鲈」按大口黑鲈（加州鲈）给结构软虫，近岸轻荡；不是欧美降压抢食。
 * 上海近海平面低压 ≤1005 hPa（酷钓鱼海拔 0 米；钓鱼之家 1006–1028 好钓）。
 * 水域/水色/塘保养见 `water.ts`：黄绿最好开口；刚换水应激；清水银白、浊水红头金。
 */
import type { FishStyle, WeatherSnapshot } from '../types';
import { shanghaiHour, shanghaiMonth } from './shanghaiTime';
import { windScale } from './windScale';
import {
  isPondWater,
  normalizeWater,
  waterFlavorOverride,
  waterLureColor,
  waterSense,
  type NormalizedWater,
  type WaterQuery,
} from './water';

export type ClimateFlags = {
  temp: number;
  hour: number;
  month: number;
  summer: boolean;
  hotNoon: boolean;
  falling: boolean;
  rising: boolean;
  highStable: boolean;
  lowPressure: boolean;
  raining: boolean;
  windy: boolean;
  prime: boolean;
  night: boolean;
};

export function climateFlags(weather: WeatherSnapshot, at: Date): ClimateFlags {
  const month = shanghaiMonth(at);
  const hour = shanghaiHour(at);
  const summer = month >= 6 && month <= 9;
  return {
    temp: weather.temperatureC,
    hour,
    month,
    summer,
    hotNoon: summer && weather.temperatureC >= 30 && hour >= 10 && hour <= 16,
    falling: weather.pressureDelta3h <= -1.5,
    rising: weather.pressureDelta3h >= 1.5,
    highStable: weather.pressureHpa >= 1022 && Math.abs(weather.pressureDelta3h) < 1,
    lowPressure: weather.pressureHpa <= 1005,
    raining:
      weather.precipitationMm > 0.2 ||
      (weather.weatherCode >= 51 && weather.weatherCode <= 67) ||
      (weather.weatherCode >= 80 && weather.weatherCode <= 82) ||
      weather.weatherCode >= 95,
    windy: windScale(weather.windKmh) >= 4,
    prime: (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19),
    night: hour < 5 || hour >= 20,
  };
}

export function planFlavor(flags: ClimateFlags, water: WaterQuery = {}): string {
  let flavor: string;
  if (flags.hotNoon || flags.temp >= 30) flavor = '本味清淡';
  else if (flags.temp < 12) flavor = '大腥';
  else if (flags.temp < 18) flavor = '腥香';
  else if (flags.temp < 26) flavor = '香腥';
  else flavor = '清香';

  if (flags.highStable && flags.temp >= 22 && flavor !== '大腥') flavor = '清香';
  if ((flags.lowPressure || flags.falling) && flavor === '本味清淡') flavor = '清淡带果酸';
  return waterFlavorOverride(flavor, normalizeWater(water));
}

export function planForm(fish: string, flags: ClimateFlags, style: FishStyle, water: WaterQuery = {}): string {
  const pond = normalizeWater(water);
  if (style === '路亚') return '拟饵';
  if (pond.pondCare === '刚换水' || pond.pondCare === '刚调水消毒') return '软粘轻口';
  if (['黄颡鱼', '鲶鱼', '塘鲺'].includes(fish)) return '虫饵';
  if (['草鱼', '鳊鱼'].includes(fish) && flags.temp >= 26) return '颗粒/玉米';
  if (pond.pondCare === '老水' || pond.waterColor === '肥浊') return '轻搓离底';
  if (['鲤鱼', '草鱼', '青鱼'].includes(fish) || flags.highStable || flags.windy) return '搓饵';
  return '拉饵';
}

const FLOAT_SPOT: Record<string, string> = {
  鲫鱼: '草边凹岸',
  鲤鱼: '凸岸缓坡亮水',
  草鱼: '水草区中层',
  青鱼: '深潭桥墩螺底',
  鳊鱼: '草边中层',
  翘嘴: '深浅交界',
  白条: '近岸浅层',
  黑鱼: '草洞草边',
  鲈鱼: '坝头乱石',
  鳜鱼: '乱石浅滩',
  黄颡鱼: '近岸障碍',
  鲶鱼: '桥洞阴处',
  罗非鱼: '浅滩向阳',
  塘鲺: '近岸障碍',
};

const LURE_SPOT: Record<string, string> = {
  翘嘴: '水草边缘 · 深浅交界',
  白条: '浅滩上层巡游',
  鲈鱼: '坝头坝脚 · 乱石结构',
  黑鱼: '草洞与草边障碍',
  鳜鱼: '乱石堆 · 浅滩草丛',
  红鳍鲌: '水草边缘',
  鲫鱼: '草边浅层（路亚效率偏低）',
  鲤鱼: '深浅交界（路亚效率偏低）',
};

export type LurePick = {
  name: string;
  color: string;
  size: string;
  retrieve: string;
};

function lureColor(flags: ClimateFlags, nightDark: boolean, water: NormalizedWater): string {
  const fromWater = waterLureColor(water, flags.raining, flags.night);
  if (fromWater) return fromWater;
  if (flags.raining) return '红头/金色';
  if (flags.night) return nightDark ? '橙红暗色' : '微光银';
  return '银白自然色';
}

function summerSpoonSize(water: NormalizedWater): string {
  return water.waterKind === '大水面' ? '7–12g' : '5–7g';
}

export function planLurePick(fish: string, flags: ClimateFlags, waterQuery: WaterQuery = {}): LurePick {
  const water = normalizeWater(waterQuery);
  const color = lureColor(flags, true, water);
  const winterFar = flags.temp < 15 || flags.month <= 3 || flags.month === 12;
  const turbid = water.waterColor === '泥浆' || water.waterColor === '肥浊';

  if (fish === '翘嘴' || fish === '红鳍鲌') {
    if (flags.prime && !flags.hotNoon && !flags.night) {
      return {
        name: '波扒 / 浮水铅笔',
        color: flags.raining ? '红头白身' : '银白',
        size: '7–9cm',
        retrieve: '压稍匀速，轻抽一停仿逃窜',
      };
    }
    if (flags.night) {
      return {
        name: '勺型亮片',
        color: '暗色/微光',
        size: '7–10g',
        retrieve: '匀速小摆，靠水波诱口',
      };
    }
    if (flags.hotNoon || flags.temp < 12) {
      return {
        name: '深潜米诺 / 亮片搜底',
        color: flags.raining ? '金色' : '银白',
        size: winterFar ? '12–20g' : '7–12g',
        retrieve: '读秒下沉后慢收，偶作停顿',
      };
    }
    const summerSize = summerSpoonSize(water);
    return {
      name: '斜切亮片（带红羽更好）',
      color,
      size: flags.summer ? summerSize : winterFar ? '12–20g' : '7–10g',
      retrieve: flags.summer
        ? water.waterKind === '大水面'
          ? '匀速收，间停两秒；大水面略加重'
          : '匀速收，间停两秒；淀山湖滴水湖等大水面可加到 7–12g'
        : '匀速收，间停两秒仿伤鱼',
    };
  }

  if (fish === '白条') {
    return {
      name: '瓜子亮片',
      color: flags.night ? '橙红' : '银白',
      size: '1.5–3g',
      retrieve: '微物快收搜上层',
    };
  }

  if (fish === '黑鱼') {
    if (flags.hotNoon) {
      return {
        name: '深潜米诺 / 小胖子',
        color: '自然色',
        size: '7–10cm',
        retrieve: '沿草边光水慢搜；密草仍换雷蛙',
      };
    }
    return {
      name: '雷蛙',
      color: flags.raining ? '黄白亮色' : '黑绿蛙色',
      size: '10–14g',
      retrieve: '草上轻跳停顿；中鱼后等两三秒再抽，钩透硬嘴',
    };
  }

  if (fish === '鲈鱼') {
    const bassColor = turbid ? '红头金/高对比' : flags.raining ? '艳色' : flags.prime && !flags.hotNoon ? '银白青背' : '青背/虾色';
    if (flags.prime && !flags.hotNoon) {
      return {
        name: turbid ? '加震米诺 / 复合亮片' : '浅层米诺',
        color: bassColor,
        size: '7–10cm',
        retrieve: turbid
          ? '贴障碍近岸多抛，加震或高对比，视线差时不要远搜亮水'
          : '抽停搜坝头乱石，近岸轻荡不必远投',
      };
    }
    return {
      name: turbid ? '加震软虫 / 铅头钩' : '铅头钩软虫',
      color: bassColor,
      size: '3–5寸',
      retrieve: turbid ? '贴结构跳底，近岸多抛' : '跳底贴结构，近岸轻荡不必远投',
    };
  }

  if (fish === '鳜鱼') {
    if (flags.night) {
      return { name: '发声VIB', color: '暗色', size: '4–6cm', retrieve: '中下层匀速，让饵发声' };
    }
    return {
      name: '铅头钩卷尾蛆',
      color: '暗色虾型',
      size: flags.hour >= 9 && flags.hour <= 17 ? '7–10g' : '5–7g',
      retrieve: '贴底慢跳，遇障碍停顿',
    };
  }

  if (fish === '鲶鱼' || fish === '塘鲺') {
    return {
      name: '胡须佬 / 德州软虫',
      color: '暗色',
      size: '铅头 5–10g',
      retrieve: '贴底慢拖或跳底',
    };
  }

  if (fish === '黄颡鱼') {
    return { name: '小型软虫', color: '暗色', size: '铅头 3–5g', retrieve: '近岸障碍慢跳' };
  }

  if (fish === '罗非鱼') {
    return { name: '小亮片', color: '银白', size: '3–5g', retrieve: '浅滩匀速' };
  }

  if (fish === '鳡鱼') {
    return { name: '波扒 / 大米诺', color: '银白', size: '10cm+', retrieve: '水面系快抽' };
  }

  return {
    name: '小亮片（路亚效率偏低）',
    color: '银白',
    size: '3–7g',
    retrieve: '搜浅层，更建议改台钓',
  };
}

export function planLure(fish: string, flags: ClimateFlags, water: WaterQuery = {}): string {
  const pick = planLurePick(fish, flags, water);
  return `${pick.size} ${pick.color} ${pick.name}`;
}

export function planLureNote(fish: string, flags: ClimateFlags, water: WaterQuery = {}): string {
  return planLurePick(fish, flags, water).retrieve;
}

export function planSpot(fish: string, flags: ClimateFlags, style: FishStyle, waterQuery: WaterQuery = {}): string {
  const water = normalizeWater(waterQuery);
  let base =
    style === '路亚'
      ? (LURE_SPOT[fish] ?? '水草边缘 · 结构区')
      : (FLOAT_SPOT[fish] ?? '草边缓流');

  if (water.waterKind === '河口' && (fish === '鲈鱼' || fish === '鲻鱼' || fish === '黄鱼')) {
    base = '潮沟闸口 · 缓流边';
  }
  if (water.waterKind === '大水面' && (fish === '翘嘴' || fish === '红鳍鲌') && !flags.prime) {
    base = style === '路亚' ? '深浅交界 · 可略远投' : base;
  }

  if (isPondWater(water.waterKind)) {
    if (water.pondCare === '刚换水' || water.pondCare === '刚调水消毒') {
      return `进水口缓流轻口 · ${base}`;
    }
    if (water.pondCare === '老水') return `略离底避酱层 · ${base}`;
    if (flags.hotNoon) return `荫凉边 / 增氧机附近 · ${base}`;
  }

  if (flags.raining) return `进水口缓流 · ${base}`;
  if (flags.hotNoon) return `荫凉桥洞 / 深水 · ${base}`;
  if (flags.temp < 12) return `向阳深水 · ${base}`;
  if (flags.prime && !flags.hotNoon) {
    if (style === '路亚' && (fish === '翘嘴' || fish === '白条')) return '近岸浅滩水草边';
    if (style === '台钓' && (fish === '鲫鱼' || fish === '白条')) return '近岸浅滩草边';
  }
  if (flags.windy) return style === '路亚' ? `侧风岸结构 · ${base}` : `下风口 · ${base}`;
  return base;
}

export function planWindow(flags: ClimateFlags, waterQuery: WaterQuery = {}): string {
  const water = normalizeWater(waterQuery);
  if (water.waterColor === '恶水') return '水色不宜';
  if (water.pondCare === '刚换水') return '刚换水口差';
  if (water.pondCare === '刚调水消毒') return '调水后口差';
  if (water.waterColor === '泥浆') {
    const sense = waterSense(waterQuery.targetFish, waterQuery.style);
    if (sense === '底栖') return '泥浆尚可虫饵';
    if (sense === '鳜') return '泥浆仍可伏击';
    return '泥浆口差';
  }
  if (flags.hotNoon) return '避开正午';
  if (flags.falling || flags.lowPressure) return '气压走低口差';
  if (flags.rising) return '气压回升窗口';
  if (flags.prime) return '早晚优先';
  if (flags.highStable) return '高压宜守底';
  return '按气压择时';
}

export function baitLabel(flavor: string, form: string, style: FishStyle, lure: string): string {
  if (style === '路亚') return lure;
  if (form === '虫饵') return `${flavor}蚯蚓红虫`;
  if (form === '颗粒/玉米') return `${flavor}颗粒`;
  if (form === '软粘轻口') return `${flavor}软粘饵`;
  if (form === '轻搓离底') return `${flavor}轻搓`;
  return `${flavor}${form}`;
}
