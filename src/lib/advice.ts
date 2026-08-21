import { coerceFishForStyle, fishFitsStyle, catalogForStyle } from './fishId/catalog';
import { clampLayerToHabit } from './fishGuide';
import { baitLabel, climateFlags, planFlavor, planForm, planLure, planLureNote, planLurePick, planSpot, planWindow } from './plan';
import { pickLureScent } from './lureScent';
import { lureColorWhy, recommendLureColors } from './lureColor';
import { rainTintToGuess, sightedWaterHow } from './sightedWater';
import type { FishStyle, FishingAdvice, SightedWater, WaterLayer, WeatherSnapshot } from '../types';

const LAYER_ORDER: WaterLayer[] = ['底层', '中下层', '中上层', '上层'];

function liftLayer(layer: WaterLayer): WaterLayer {
  const i = LAYER_ORDER.indexOf(layer);
  return LAYER_ORDER[Math.min(i + 1, LAYER_ORDER.length - 1)];
}

export function buildAdvice(
  weather: WeatherSnapshot,
  at: Date = new Date(),
  options: { targetFish?: string; style?: FishStyle; sightedWater?: SightedWater | null } = {},
): FishingAdvice {
  const flags = climateFlags(weather, at, { sightedWater: options.sightedWater });
  const reasons: string[] = [];
  const style: FishStyle = options.style ?? '台钓';

  let layer: WaterLayer;
  let baits: string[];
  let method: string;
  let tip: string;
  let targetFish: string[];

  if (flags.hotNoon) {
    layer = '底层';
    baits = ['清淡香饵', '玉米', '小麦胚芽', '螺蛳（青鱼）'];
    method = '台钓守底 / 夜钓';
    tip = '避开正午暴晒水面，找树荫、桥洞或等夜钓；线组放细，抛频放慢。';
    targetFish = ['鲫鱼', '鲤鱼', '青鱼', '草鱼'];
    reasons.push(`经验：盛夏正午气温 ${weather.temperatureC.toFixed(0)}°C，常守底避晒（空气温度，不是水温）`);
  } else if (flags.falling) {
    layer = '中上层';
    baits = ['腥香商品饵', '活虾', '亮片/米诺', '蚯蚓'];
    method = '台钓加快抛频 / 路亚搜上层';
    tip = '经验倾向：急降时常搜中上、加快抛频；方向有争议，不是溶氧实测。';
    targetFish = ['翘嘴', '白条', '鲈鱼', '黄颡鱼'];
    reasons.push(`经验：近 3 小时模式气压下降 ${Math.abs(weather.pressureDelta3h).toFixed(1)} hPa，常搜中上（有争议）`);
  } else if (flags.highStable) {
    layer = '底层';
    baits = ['蚯蚓', '红虫', '腥味搓饵', '小钩细线'];
    method = '传统钓 / 台钓守底';
    tip = '经验倾向：高压走稳时常守底、少逗；不是贴底因缺氧。';
    targetFish = ['鲫鱼', '鲤鱼', '黄颡鱼'];
    reasons.push(`经验：海平面气压 ${weather.pressureHpa.toFixed(0)} hPa 走稳，手册常守底`);
  } else if (flags.lowPressure) {
    layer = '中上层';
    baits = ['轻质拉饵', '浮钓草饵', '铅笔/波扒', '活饵'];
    method = '浮钓 / 路亚表层';
    tip = '经验倾向：低压时常钓中上、饵要轻；不是氧薄。';
    targetFish = ['白条', '翘嘴', '鳊鱼', '草鱼'];
    reasons.push(`经验：海平面气压 ${weather.pressureHpa.toFixed(0)} hPa 偏低，手册常搜中上`);
  } else {
    layer = '中下层';
    baits = ['香腥拉饵', '蚯蚓', '玉米', '螺蛳'];
    method = '台钓找底后略离底';
    tip = '先找实底，再上拉 5–10 厘米；根据口动再升降一层。';
    targetFish = ['鲫鱼', '鳊鱼', '鲤鱼', '草鱼'];
    reasons.push('经验起点：中下层搜索，再按口动升降');
  }

  if (flags.raining) {
    const before = layer;
    layer = liftLayer(layer);
    reasons.push(`经验：有降水，水层由${before}上调至${layer}，进水口附近优先`);
    if (!baits.includes('蚯蚓')) baits = ['蚯蚓', ...baits].slice(0, 4);
  }

  if (flags.windy) {
    reasons.push(`经验：风速 ${weather.windKmh.toFixed(0)} km/h，改抗风钓组、加重饵，路亚走侧风岸`);
    tip = `${tip} 风大时用吃铅更大的漂，或改岸边避风。`;
  }

  if (flags.prime && !flags.hotNoon) {
    targetFish = Array.from(new Set(['白条', '翘嘴', ...targetFish]));
    reasons.push('经验：晨昏窗口，浅层对象常靠边巡游');
  }

  reasons.push(
    flags.sightedWater
      ? `目测水色：${flags.sightedWater}（${sightedWaterHow(flags.sightedWater)}）`
      : `未目测，暂按降水推演${flags.waterTint}（约${rainTintToGuess(flags.waterTint)}，到塘后请点选）`,
  );

  targetFish = targetFish.filter((name) => fishFitsStyle(name, style));
  if (!targetFish.length) targetFish = catalogForStyle(style).slice(0, 4);

  const requested = options.targetFish && options.targetFish !== '不确定' ? options.targetFish : '';
  const focus = coerceFishForStyle(requested || targetFish[0] || '', style);
  if (!targetFish.includes(focus)) {
    targetFish = [focus, ...targetFish].slice(0, 4);
  }

  if (['黑鱼', '鳜鱼', '鲈鱼'].includes(focus) && style === '路亚') {
    layer = flags.hotNoon ? '中下层' : flags.prime ? '上层' : layer;
  }
  if ((focus === '翘嘴' || focus === '白条') && style === '路亚' && flags.prime) {
    layer = '上层';
  }
  layer = clampLayerToHabit(focus, layer);

  const flavor = planFlavor(flags);
  const form = planForm(focus, flags, style);
  const lurePick = planLurePick(focus, flags);
  const lure = planLure(focus, flags);
  const lureNote = style === '路亚' ? planLureNote(focus, flags) : '';
  const colorAdvice =
    style === '路亚'
      ? recommendLureColors({
          fish: focus,
          sighted: flags.sightedWater,
          rainTint: flags.waterTint,
          night: flags.night,
        })
      : null;
  const scentRow =
    style === '路亚'
      ? pickLureScent({
          fish: focus,
          lureName: lurePick.name,
          temp: flags.temp,
          sightedWater: flags.sightedWater,
        })
      : null;
  const lureScent = scentRow?.copy ?? '';
  const label = baitLabel(flavor, form, style, lure);
  const spot = planSpot(focus, flags, style);
  const window = planWindow(flags);

  if (style === '路亚') {
    method = `路亚 · ${lure}`;
    const topColor = colorAdvice?.ranked[0];
    const colorBit = topColor ? `饵色优先${topColor.family}。` : '';
    tip = `主攻${focus}：${colorBit}在${spot}搜索，拟饵用${lure}，操法${lureNote}。${tip}`;
    baits = Array.from(new Set([lure, ...baits])).slice(0, 4);
    if (colorAdvice) reasons.unshift(lureColorWhy(colorAdvice, focus));
  } else {
    method = method.startsWith('路亚') ? `台钓 · ${form}` : method;
    baits = Array.from(new Set([label, ...baits])).slice(0, 4);
    reasons.unshift(`经验：${focus}用${flavor}${form}，标点在${spot}`);
  }

  if (layer !== '底层' && /守底/.test(method)) {
    method = style === '路亚' ? `路亚 · ${lure}` : `台钓 · ${form}`;
  }

  return {
    layer,
    baits,
    method,
    tip,
    reasons: reasons.slice(0, 6),
    targetFish,
    flavor,
    form,
    baitLabel: label,
    spot,
    lure,
    lureNote,
    lureScent: lureScent || undefined,
    lureScentClass: scentRow?.class,
    lureColors: colorAdvice?.ranked.slice(0, 3),
    lureColorWhy: colorAdvice ? lureColorWhy(colorAdvice, focus) : undefined,
    window,
  };
}
