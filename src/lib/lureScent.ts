/**
 * 路亚诱鱼剂对标表：贝克力厂方实验室公开数字 + 独立综述。
 * 数字不是渔见实测，不是上海开口保证。运行时不联网。
 */
import type { SightedWater } from '../types';

/** 贝克力 Fish Research Center 公开报道中的缸测/营销数字。 */
export const BERKLEY_SCENT_BENCH = {
  spitIfNotFoodSec: 0.25,
  holdPlainPvcSec: 1,
  holdSurfaceScentSec: 3,
  holdPowerBaitSec: 18,
  gulpDispersionClaimX: 400,
  maxScentVsPowerBaitCatchPct: 45,
  oilBasedSmellable: false,
  source:
    'Berkley Fish Research Center（Keith Jones / Mark Sexton / John Prochnow）；综述 USAngler、Game & Fish、In-Fisherman；中文转述碧溪上',
} as const;

/** 诱鱼剂对「开口」vs「含饵」的机制。禁止把厂方营销数字写成开口保证。 */
export const SCENT_MECHANISM = {
  opening: '弱。鲈以视觉和侧线决定第一口；诱鱼剂很少从远处把鱼招来开口。',
  hold: '主。咬住后延长含饵，给刺鱼时间。厂方缸测：无味约1秒，表面加香约3秒，PowerBait约18秒。',
  nearCloud: '次。水溶性基质（对标 Gulp）近距嗅觉云，浊水可能多看一眼。厂方宣称扩散约400倍，不是远诱开口保证。',
  oilSpray: '无效。油性喷剂不溶于水，鱼闻不到（Berkley Mark Sexton）。',
  mask: '蒜香/茴香多作遮塑料味与人手味，不是远诱开口。',
} as const;

export type LureScentClass = 'hard' | 'salt-pvc' | 'powerbait-like' | 'gulp-like';

export const SCENT_CLASS_LABEL: Record<LureScentClass, string> = {
  hard: '硬饵无味型',
  'salt-pvc': '加盐软饵',
  'powerbait-like': '渗香 · PowerBait',
  'gulp-like': '水溶性 · Gulp近云',
};

export const SCENT_HOLD_BARS = [
  { id: 'plain', label: '无味PVC', sec: BERKLEY_SCENT_BENCH.holdPlainPvcSec },
  { id: 'surface', label: '表面加香', sec: BERKLEY_SCENT_BENCH.holdSurfaceScentSec },
  { id: 'powerbait', label: 'PowerBait', sec: BERKLEY_SCENT_BENCH.holdPowerBaitSec },
] as const;

export function holdBarPct(sec: number): number {
  return Math.round((sec / BERKLEY_SCENT_BENCH.holdPowerBaitSec) * 100);
}

export const SCENT_CHIPS = ['开口弱', '含饵主', '油性无效'] as const;

export type LureScentRow = {
  class: LureScentClass;
  mechanism: 'none' | 'hold' | 'hold-plus-near-cloud' | 'mask';
  copy: string;
};

export function isSoftLure(name: string): boolean {
  return /软虫|卷尾|胡须佬|德州/.test(name);
}

function stained(water: SightedWater | null): boolean {
  return water === '浑浊' || water === '微浑';
}

export function pickLureScent(input: {
  fish: string;
  lureName: string;
  temp: number;
  sightedWater: SightedWater | null;
}): LureScentRow {
  if (!isSoftLure(input.lureName)) {
    return {
      class: 'hard',
      mechanism: 'none',
      copy: '硬饵无味型，靠泳姿与反光。厂方：油性喷剂鱼闻不到。',
    };
  }

  const cold = input.temp < 18;
  const green = input.sightedWater === '肥水';
  const clear = input.sightedWater === '清澈';
  const scentHunter = input.fish === '鲶鱼' || input.fish === '塘鲺' || input.fish === '黄颡鱼';

  if (scentHunter) {
    const copy =
      input.fish === '黄颡鱼'
        ? '加盐虾腥小软虫。鲶科靠嗅味，水溶性大腥贴底，不是远诱开口。'
        : '加盐大腥（肝/虾），贴底慢拖。对标水溶性诱鱼软饵，不是远诱开口。';
    return { class: 'gulp-like', mechanism: 'hold-plus-near-cloud', copy };
  }

  if (input.fish === '鳜鱼') {
    return {
      class: cold || stained(input.sightedWater) ? 'gulp-like' : 'powerbait-like',
      mechanism: cold || stained(input.sightedWater) ? 'hold-plus-near-cloud' : 'hold',
      copy: cold ? '加盐虾腥卷尾，慢跳才闻得到' : '加盐虾腥卷尾（含饵更久，不是远诱）',
    };
  }

  if (input.fish === '鲈鱼') {
    if (green) {
      return {
        class: 'salt-pvc',
        mechanism: 'mask',
        copy: '加盐虾或蒜香，遮塑料味，慢跳贴结构',
      };
    }
    if (clear && !cold) {
      return {
        class: 'salt-pvc',
        mechanism: 'hold',
        copy: '本味加盐软虫，清水细看靠泳姿。诱鱼剂只延长含饵，不是远诱。',
      };
    }
    if (cold) {
      return {
        class: 'powerbait-like',
        mechanism: 'hold',
        copy: '加盐虾腥/蒜香（对标贝克力），口轻时含久一点再刺，不是远诱。',
      };
    }
    if (stained(input.sightedWater)) {
      return {
        class: 'gulp-like',
        mechanism: 'hold-plus-near-cloud',
        copy: '浊水用水溶性虾腥软饵（对标贝克力 Gulp 近云）。含饵更久，不是远诱开口。',
      };
    }
    return {
      class: 'powerbait-like',
      mechanism: 'hold',
      copy: '加盐虾味软虫（对标贝克力 PowerBait）。厂方缸测含饵更久，不是远诱。',
    };
  }

  if (input.fish === '翘嘴' || input.fish === '红鳍鲌') {
    return {
      class: 'salt-pvc',
      mechanism: 'hold',
      copy: cold ? 'T尾加盐虾腥，慢搜中层' : 'T尾加盐微腥，仍靠泳姿追猎。不是远诱开口。',
    };
  }

  if (cold) {
    return {
      class: 'powerbait-like',
      mechanism: 'hold',
      copy: '加盐虾腥，低温含饵更久再刺。对标贝克力渗香，不是远诱。',
    };
  }

  return {
    class: 'salt-pvc',
    mechanism: 'hold',
    copy: '加盐软虫，腥度随气温，不是远诱开口',
  };
}

export function planLureScent(
  fish: string,
  flags: { temp: number; sightedWater: SightedWater | null },
  lureName: string,
): string {
  return pickLureScent({
    fish,
    lureName,
    temp: flags.temp,
    sightedWater: flags.sightedWater,
  }).copy;
}
