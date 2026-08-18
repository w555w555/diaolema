import { describe, expect, it } from 'vitest';
import { DEFAULT_INGEST_CONFIG } from './config';
import { extractInfo, mergeRuleAndAi } from './extract';

describe('extractInfo', () => {
  it('从文案抽出钓点、鱼种、钓法', () => {
    const info = extractInfo('路亚阿周 3小时前在滴水湖路亚中鲈鱼 用米诺 钓了3条', DEFAULT_INGEST_CONFIG, {
      selectedLocation: '上海',
    });
    expect(info.city).toBe('上海');
    expect(info.location_text).toBe('滴水湖');
    expect(info.fish_species).toBe('鲈鱼');
    expect(info.fishing_method).toBe('路亚');
    expect(info.bait).toBe('米诺');
    expect(info.catch_amount).toContain('3');
    expect(info.confidence_score).toBeGreaterThan(0.5);
  });

  it('没有命中时字段为空', () => {
    const info = extractInfo('今天天气不错', DEFAULT_INGEST_CONFIG);
    expect(info.fish_species).toBe('');
    expect(info.location_text).toBe('');
  });
});

describe('mergeRuleAndAi', () => {
  const rule = {
    city: '上海',
    location_text: '',
    fish_species: '鲫鱼',
    fishing_method: '',
    bait: '',
    catch_amount: '',
    confidence_score: 0.4,
  };

  it('AI 只补规则空字段，不覆盖已有鱼种', () => {
    const merged = mergeRuleAndAi(rule, {
      summary: '淀山湖台钓',
      location: '淀山湖',
      fish_species: '鲤鱼',
      fishing_method: '台钓',
      bait: '蚯蚓',
      catch_amount: '2条',
      time_hint: '今早',
      confidence_score: 0.8,
    });
    expect(merged.final_fish_species).toBe('鲫鱼');
    expect(merged.final_location_text).toBe('淀山湖');
    expect(merged.final_city).toBe('淀山湖');
    expect(merged.final_fishing_method).toBe('台钓');
    expect(merged.final_bait).toBe('蚯蚓');
    expect(merged.final_catch_amount).toBe('2条');
    expect(merged.final_confidence).toBe(0.8);
  });

  it('AI 置信度为空时不抛错', () => {
    const merged = mergeRuleAndAi(rule, {
      summary: '',
      location: '',
      fish_species: '',
      fishing_method: '',
      bait: '',
      catch_amount: '',
      time_hint: '',
      confidence_score: null,
    });
    expect(merged.final_confidence).toBe(0.4);
    expect(merged.final_fish_species).toBe('鲫鱼');
  });

  it('置信度不超过 1', () => {
    const merged = mergeRuleAndAi({ ...rule, confidence_score: 0.9 }, { confidence_score: 1.4 });
    expect(merged.final_confidence).toBe(1);
  });
});
