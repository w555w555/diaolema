import { describe, expect, it } from 'vitest';
import {
  BERKLEY_SCENT_BENCH,
  SCENT_CHIPS,
  SCENT_HOLD_BARS,
  SCENT_MECHANISM,
  holdBarPct,
  isSoftLure,
  pickLureScent,
  planLureScent,
} from './lureScent';

describe('BERKLEY_SCENT_BENCH', () => {
  it('锁住厂方缸测数字，不把油性喷剂当可闻', () => {
    expect(BERKLEY_SCENT_BENCH.spitIfNotFoodSec).toBe(0.25);
    expect(BERKLEY_SCENT_BENCH.holdPlainPvcSec).toBe(1);
    expect(BERKLEY_SCENT_BENCH.holdSurfaceScentSec).toBe(3);
    expect(BERKLEY_SCENT_BENCH.holdPowerBaitSec).toBe(18);
    expect(BERKLEY_SCENT_BENCH.gulpDispersionClaimX).toBe(400);
    expect(BERKLEY_SCENT_BENCH.maxScentVsPowerBaitCatchPct).toBe(45);
    expect(BERKLEY_SCENT_BENCH.oilBasedSmellable).toBe(false);
  });

  it('机制表把开口标弱、含饵标主', () => {
    expect(SCENT_MECHANISM.opening).toMatch(/弱|很少/);
    expect(SCENT_MECHANISM.hold).toMatch(/主|18/);
    expect(SCENT_MECHANISM.nearCloud).toMatch(/不是远诱/);
    expect(SCENT_MECHANISM.oilSpray).toMatch(/闻不到/);
  });

  it('含饵对照条按 PowerBait 18 秒拉满', () => {
    expect(holdBarPct(BERKLEY_SCENT_BENCH.holdPowerBaitSec)).toBe(100);
    expect(holdBarPct(BERKLEY_SCENT_BENCH.holdPlainPvcSec)).toBeLessThan(
      holdBarPct(BERKLEY_SCENT_BENCH.holdSurfaceScentSec),
    );
    expect(SCENT_HOLD_BARS.map((row) => row.sec)).toEqual([1, 3, 18]);
    expect(SCENT_CHIPS).toEqual(['开口弱', '含饵主', '油性无效']);
  });
});

describe('pickLureScent', () => {
  it('硬饵无内置诱鱼剂，并写油性喷剂无效', () => {
    const row = pickLureScent({
      fish: '翘嘴',
      lureName: '斜切亮片',
      temp: 26,
      sightedWater: null,
    });
    expect(isSoftLure('斜切亮片')).toBe(false);
    expect(row.class).toBe('hard');
    expect(row.mechanism).toBe('none');
    expect(row.copy).toMatch(/硬饵无味型/);
    expect(row.copy).toMatch(/油性/);
    expect(row.copy).not.toMatch(/400|45%/);
  });

  it('鲈鱼软饵对标 PowerBait 含饵，不是远诱开口', () => {
    const row = pickLureScent({
      fish: '鲈鱼',
      lureName: '铅头钩软虫',
      temp: 22,
      sightedWater: null,
    });
    expect(row.class).toBe('powerbait-like');
    expect(row.mechanism).toBe('hold');
    expect(row.copy).toMatch(/加盐虾/);
    expect(row.copy).toMatch(/PowerBait|贝克力/);
    expect(row.copy).toMatch(/不是远诱|含饵/);
    expect(row.copy).not.toMatch(/400|45%/);
  });

  it('浊水鲈改 Gulp 近云，仍禁止远诱开口保证', () => {
    const row = pickLureScent({
      fish: '鲈鱼',
      lureName: '铅头钩软虫',
      temp: 22,
      sightedWater: '浑浊',
    });
    expect(row.class).toBe('gulp-like');
    expect(row.mechanism).toBe('hold-plus-near-cloud');
    expect(row.copy).toMatch(/不是远诱/);
  });

  it('鲶科用水溶性大腥', () => {
    const row = pickLureScent({
      fish: '鲶鱼',
      lureName: '胡须佬 / 德州软虫',
      temp: 20,
      sightedWater: null,
    });
    expect(row.class).toBe('gulp-like');
    expect(row.copy).toMatch(/大腥/);
  });

  it('方案文案走同一张表', () => {
    expect(
      planLureScent('鲈鱼', { temp: 10, sightedWater: null }, '铅头钩软虫'),
    ).toMatch(/虾腥|蒜香/);
    expect(
      planLureScent('鲈鱼', { temp: 22, sightedWater: '清澈' }, '铅头钩软虫'),
    ).toMatch(/本味加盐/);
  });
});
