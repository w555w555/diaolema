import { describe, expect, it } from 'vitest';
import { windDirLabel, windScaleLabel } from './weather';

describe('windScaleLabel', () => {
  it('把 km/h 收成中国气象几级', () => {
    expect(windScaleLabel(0)).toBe('0级');
    expect(windScaleLabel(8)).toBe('2级');
    expect(windScaleLabel(15)).toBe('3级');
    expect(windScaleLabel(28)).toBe('4级');
    expect(windScaleLabel(29)).toBe('5级');
  });
});

describe('windDirLabel', () => {
  it('东南风', () => {
    expect(windDirLabel(135)).toBe('东南风');
  });
});
