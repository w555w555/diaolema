import { describe, expect, it } from 'vitest';
import { reportSpotName } from './reportSpot';

describe('reportSpotName', () => {
  it('空钓点不能上报', () => {
    expect(reportSpotName('')).toBeNull();
    expect(reportSpotName('   ')).toBeNull();
    expect(reportSpotName('滴水湖东岸')).toBe('滴水湖东岸');
  });
});
