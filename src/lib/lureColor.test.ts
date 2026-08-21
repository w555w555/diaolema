import { describe, expect, it } from 'vitest';
import { lureColorSeedRows, lureColorWhy, recommendLureColors, topLureColorFamily } from './lureColor';
import type { SightedWater } from '../types';

const WATERS: SightedWater[] = ['清澈', '微浑', '浑浊', '肥水'];

describe('recommendLureColors', () => {
  it('翘嘴清水银白、浊水红头金、肥水草黄', () => {
    expect(topLureColorFamily({ fish: '翘嘴', sighted: '清澈', rainTint: '偏清' })).toBe('银白');
    expect(topLureColorFamily({ fish: '翘嘴', sighted: '浑浊', rainTint: '偏清' })).toBe('红头金');
    expect(topLureColorFamily({ fish: '翘嘴', sighted: '肥水', rainTint: '偏清' })).toBe('草黄');
  });

  it('鲈鱼清水银白家族、浑浊红头金', () => {
    expect(topLureColorFamily({ fish: '鲈鱼', sighted: '清澈', rainTint: '偏清' })).toBe('银白');
    expect(topLureColorFamily({ fish: '鲈鱼', sighted: '浑浊', rainTint: '偏清' })).toBe('红头金');
  });

  it('黑鱼清水暗色、浑浊偏红头金、肥水草黄', () => {
    expect(topLureColorFamily({ fish: '黑鱼', sighted: '清澈', rainTint: '偏清' })).toBe('暗色');
    expect(topLureColorFamily({ fish: '黑鱼', sighted: '浑浊', rainTint: '偏清' })).toBe('红头金');
    expect(topLureColorFamily({ fish: '黑鱼', sighted: '肥水', rainTint: '偏清' })).toBe('草黄');
  });

  it('鲶鳜贴底以暗色为主，水色只微调', () => {
    expect(topLureColorFamily({ fish: '鲶鱼', sighted: '清澈', rainTint: '偏清' })).toBe('暗色');
    expect(topLureColorFamily({ fish: '鲶鱼', sighted: '浑浊', rainTint: '偏清' })).toBe('暗色');
    expect(topLureColorFamily({ fish: '鳜鱼', sighted: '清澈', rainTint: '偏清' })).toBe('暗色');
  });

  it('未目测时按降水猜色，不猜肥水', () => {
    expect(topLureColorFamily({ fish: '翘嘴', sighted: null, rainTint: '浑浊' })).toBe('红头金');
    const row = recommendLureColors({ fish: '翘嘴', sighted: null, rainTint: '浑浊' });
    expect(row.fromSight).toBe(false);
    expect(row.water).toBe('浑浊');
  });

  it('夜钓抬橙红或暗色', () => {
    expect(topLureColorFamily({ fish: '白条', sighted: '清澈', rainTint: '偏清', night: true })).toBe('橙红');
    expect(topLureColorFamily({ fish: '翘嘴', sighted: '清澈', rainTint: '偏清', night: true })).toBe('橙红');
  });

  it('每种水色都给出可排序分数', () => {
    for (const water of WATERS) {
      const ranked = recommendLureColors({ fish: '翘嘴', sighted: water, rainTint: '偏清' }).ranked;
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
      expect(ranked.reduce((sum, row) => sum + row.score, 0)).toBeGreaterThanOrEqual(98);
    }
  });

  it('词表可展开为数据库行', () => {
    const rows = lureColorSeedRows();
    expect(rows.length).toBe(144);
    expect(rows.some((row) => row.fish === '*' && row.water === '清澈' && row.family === '银白')).toBe(true);
    expect(rows.some((row) => row.fish === '翘嘴' && row.water === '肥水' && row.family === '草黄')).toBe(true);
  });

  it('建议饵色文案短、不含溶氧开口', () => {
    const advice = recommendLureColors({ fish: '翘嘴', sighted: '清澈', rainTint: '偏清' });
    const copy = lureColorWhy(advice, '翘嘴');
    expect(copy.length).toBeLessThan(48);
    expect(copy).toMatch(/^饵色：/);
    expect(copy).not.toMatch(/溶氧|开口保证/);
  });
});
