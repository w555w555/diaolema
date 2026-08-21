import { coerceFishForStyle, fishFitsStyle, catalogForStyle } from './fishId/catalog';
import { baitLabel, climateFlags, planFlavor, planForm, planLure, planLureNote, planSpot, planWindow } from './plan';
import { isPondWater, normalizeWater, waterAdviceNotes, type WaterQuery } from './water';
import { windScaleLabel } from './windScale';
import type { FishStyle, FishingAdvice, WaterLayer, WeatherSnapshot } from '../types';

const LAYER_ORDER: WaterLayer[] = ['底层', '中下层', '中上层', '上层'];

function liftLayer(layer: WaterLayer): WaterLayer {
  const i = LAYER_ORDER.indexOf(layer);
  return LAYER_ORDER[Math.min(i + 1, LAYER_ORDER.length - 1)];
}

export function buildAdvice(
  weather: WeatherSnapshot,
  at: Date = new Date(),
  options: { targetFish?: string; style?: FishStyle } & WaterQuery = {},
): FishingAdvice {
  const flags = climateFlags(weather, at);
  const reasons: string[] = [];
  const style: FishStyle = options.style ?? '台钓';
  const water = normalizeWater(options);

  let layer: WaterLayer;
  let baits: string[];
  let method: string;
  let tip: string;
  let targetFish: string[];

  if (flags.hotNoon) {
    const muggy = flags.falling || flags.lowPressure;
    layer = muggy ? '中下层' : '底层';
    baits = ['清淡香饵', '玉米', '小麦胚芽', '螺蛳（青鱼）'];
    method = '台钓守底 / 夜钓';
    tip = muggy
      ? isPondWater(water.waterKind)
        ? '正午塘底也容易闷。改荫凉边、增氧机附近的中下层，不要死守亮水底。'
        : '正午亮水底也容易闷。改树荫、桥洞或进水口的中下层，不要死守浅滩底。'
      : '避开正午暴晒水面，找树荫、桥洞或等夜钓；线组放细，抛频放慢。';
    targetFish = ['鲫鱼', '鲤鱼', '青鱼', '草鱼'];
    reasons.push(`盛夏正午气温 ${weather.temperatureC.toFixed(0)}°C，鱼下沉避热`);
    if (muggy) reasons.push('正午叠加气压走低，改荫凉中下层，不要死守亮水底');
  } else if (flags.falling) {
    layer = '中上层';
    baits = ['轻质拉饵', '小钩细线', '蚯蚓', '亮片/米诺'];
    method = '台钓改浮或半水 / 路亚放慢搜中上';
    tip = '气压走低鱼上浮找氧，口往往变轻。优先进水口、下风口、水草边，不要当成抢食窗口。';
    targetFish = ['白条', '翘嘴', '鳊鱼', '草鱼'];
    reasons.push(`近 3 小时气压下降 ${Math.abs(weather.pressureDelta3h).toFixed(1)} hPa，按国内经验口易变差、鱼可能上浮找氧`);
  } else if (flags.highStable) {
    layer = '底层';
    baits = ['蚯蚓', '红虫', '腥味搓饵', '商品搓饵'];
    method = '传统钓 / 台钓守底';
    tip = '高压稳定相对好钓底，铅坠找实底守钓，鲫鲤黄颡更肯吃。';
    targetFish = ['鲫鱼', '鲤鱼', '黄颡鱼'];
    reasons.push(`海平面气压 ${weather.pressureHpa.toFixed(0)} hPa 且走势平稳，宜守底`);
  } else if (flags.lowPressure) {
    layer = '中上层';
    baits = ['轻质拉饵', '浮钓草饵', '小钩细线', '活饵'];
    method = '浮钓半水 / 路亚搜中上放慢';
    tip = '低压易闷，鱼在中上找氧但口差。找进出水口与下风；看见成片浮头就收竿。';
    targetFish = ['白条', '翘嘴', '鳊鱼', '草鱼'];
    reasons.push(`气压 ${weather.pressureHpa.toFixed(0)} hPa 偏低，中上层找氧、口差`);
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
    reasons.push(`${windScaleLabel(weather.windKmh)}风，改抗风钓组、加重饵，路亚走侧风岸`);
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
  if (focus === '鳜鱼' && style === '路亚' && !flags.prime) {
    layer = '底层';
  }
  if ((focus === '翘嘴' || focus === '白条') && style === '路亚' && flags.prime) {
    layer = '上层';
  }
  if (flags.hotNoon && style === '台钓' && (focus === '草鱼' || focus === '鳊鱼')) {
    layer = '中上层';
    reasons.push(`${focus}夏天中上层更肯吃草，改浮钓或离底`);
  }

  if ((water.pondCare === '老水' || water.waterColor === '肥浊') && layer === '底层') {
    layer = '中下层';
    reasons.push('塘底酱层或肥水时略离底，避免饵陷入');
  }
  if ((water.pondCare === '刚换水' || water.pondCare === '刚调水消毒') && layer === '上层') {
    layer = '中下层';
  }

  const flavor = planFlavor(flags, water);
  const form = planForm(focus, flags, style, water);
  const lure = planLure(focus, flags, water);
  const lureNote = style === '路亚' ? planLureNote(focus, flags, water) : '';
  const label = baitLabel(flavor, form, style, lure);
  const spot = planSpot(focus, flags, style, water);
  const window = planWindow(flags, water);
  const waterNotes = waterAdviceNotes(water);

  if (style === '路亚') {
    method = `路亚 · ${lure}`;
    tip = `主攻${focus}：在${spot}搜索，拟饵用${lure}，操法${lureNote}。${tip}`;
    baits = Array.from(new Set([lure, ...baits])).slice(0, 4);
  } else {
    method = method.startsWith('路亚') ? `台钓 · ${form}` : method;
    baits = Array.from(new Set([label, ...baits])).slice(0, 4);
    reasons.unshift(`${focus}用${flavor}${form}，标点在${spot}`);
  }

  if (water.pondCare === '刚换水' || water.pondCare === '刚调水消毒') {
    tip = `${tip} 软粘轻口，不要抽散炮。`;
  }
  if (water.waterColor === '恶水') {
    tip = '水色发黑、水华或有异味时按国内经验不宜强求出钓。';
  }

  if (waterNotes.length) reasons.unshift(...waterNotes.slice(0, 2));
  reasons.push(`湿度 ${weather.humidityPct.toFixed(0)}%`);

  return {
    layer,
    baits,
    method,
    tip,
    reasons: reasons.slice(0, 7),
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
