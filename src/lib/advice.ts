import { coerceFishForStyle, fishFitsStyle, catalogForStyle } from './fishId/catalog';
import { baitLabel, climateFlags, planFlavor, planForm, planLure, planLureNote, planSpot, planWindow } from './plan';
import type { FishStyle, FishingAdvice, WaterLayer, WeatherSnapshot } from '../types';

const LAYER_ORDER: WaterLayer[] = ['底层', '中下层', '中上层', '上层'];

function liftLayer(layer: WaterLayer): WaterLayer {
  const i = LAYER_ORDER.indexOf(layer);
  return LAYER_ORDER[Math.min(i + 1, LAYER_ORDER.length - 1)];
}

export function buildAdvice(
  weather: WeatherSnapshot,
  at: Date = new Date(),
  options: { targetFish?: string; style?: FishStyle } = {},
): FishingAdvice {
  const flags = climateFlags(weather, at);
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
    reasons.push(`盛夏正午气温 ${weather.temperatureC.toFixed(0)}°C，鱼下沉避热`);
  } else if (flags.falling) {
    layer = '中上层';
    baits = ['腥香商品饵', '活虾', '亮片/米诺', '蚯蚓'];
    method = '台钓加快抛频 / 路亚搜上层';
    tip = '气压下降鱼上浮抢食，雾化抽频率，路亚沿水草边搜索。';
    targetFish = ['翘嘴', '白条', '鲈鱼', '黄颡鱼'];
    reasons.push(`近 3 小时气压下降 ${Math.abs(weather.pressureDelta3h).toFixed(1)} hPa，鱼易上浮觅食`);
  } else if (flags.highStable) {
    layer = '底层';
    baits = ['蚯蚓', '红虫', '腥味搓饵', '小钩细线'];
    method = '传统钓 / 台钓守底';
    tip = '高气压鱼口轻，铅坠找实底，减少逗引，盯顿口。';
    targetFish = ['鲫鱼', '鲤鱼', '黄颡鱼'];
    reasons.push(`海平面气压 ${weather.pressureHpa.toFixed(0)} hPa 且走势平稳，鱼多贴底`);
  } else if (flags.lowPressure) {
    layer = '中上层';
    baits = ['轻质拉饵', '浮钓草饵', '铅笔/波扒', '活饵'];
    method = '浮钓 / 路亚表层';
    tip = '低压氧薄，鱼在中上水层活动，饵要轻、要动。';
    targetFish = ['白条', '翘嘴', '鳊鱼', '草鱼'];
    reasons.push(`气压 ${weather.pressureHpa.toFixed(0)} hPa 偏低，中上层更活跃`);
  } else {
    layer = '中下层';
    baits = ['香腥拉饵', '蚯蚓', '玉米', '螺蛳'];
    method = '台钓找底后略离底';
    tip = '先找实底，再上拉 5–10 厘米；根据口动再升降一层。';
    targetFish = ['鲫鱼', '鳊鱼', '鲤鱼', '草鱼'];
    reasons.push(`气压 ${weather.pressureHpa.toFixed(0)} hPa，按中下层作为起点搜索`);
  }

  if (flags.raining) {
    const before = layer;
    layer = liftLayer(layer);
    reasons.push(`有降水，水层由${before}上调至${layer}，进水口附近优先`);
    if (!baits.includes('蚯蚓')) baits = ['蚯蚓', ...baits].slice(0, 4);
  }

  if (flags.windy) {
    reasons.push(`风速 ${weather.windKmh.toFixed(0)} km/h，改抗风钓组、加重饵，路亚走侧风岸`);
    tip = `${tip} 风大时用吃铅更大的漂，或改岸边避风。`;
  }

  if (flags.prime && !flags.hotNoon) {
    targetFish = Array.from(new Set(['白条', '翘嘴', ...targetFish]));
    reasons.push('晨昏窗口，浅层对象鱼会靠边巡游');
  }

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

  const flavor = planFlavor(flags);
  const form = planForm(focus, flags, style);
  const lure = planLure(focus, flags);
  const lureNote = style === '路亚' ? planLureNote(focus, flags) : '';
  const label = baitLabel(flavor, form, style, lure);
  const spot = planSpot(focus, flags, style);
  const window = planWindow(flags);

  if (style === '路亚') {
    method = `路亚 · ${lure}`;
    tip = `主攻${focus}：在${spot}搜索，拟饵用${lure}，操法${lureNote}。${tip}`;
    baits = Array.from(new Set([lure, ...baits])).slice(0, 4);
  } else {
    method = method.startsWith('路亚') ? `台钓 · ${form}` : method;
    baits = Array.from(new Set([label, ...baits])).slice(0, 4);
    reasons.unshift(`${focus}用${flavor}${form}，标点在${spot}`);
  }

  reasons.push(`湿度 ${weather.humidityPct.toFixed(0)}%`);

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
    window,
  };
}
