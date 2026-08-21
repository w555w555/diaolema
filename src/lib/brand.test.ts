import { describe, expect, it } from 'vitest';
import { BRAND_NAME, MANIFESTO } from './brand';

describe('brand manifesto', () => {
  it('两句宣言原文固定', () => {
    expect(BRAND_NAME).toBe('渔见');
    expect(MANIFESTO[0]).toBe('让每一次出钓，都有方向。');
    expect(MANIFESTO[1]).toBe('让钓友找到好钓场，让好钓场生意更好。');
  });
});
