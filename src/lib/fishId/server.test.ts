import { describe, expect, it } from 'vitest';
import { fishIdAgentUrl, identifyFishFromImage } from './server';

describe('identifyFishFromImage', () => {
  it('无 Key 时抛 not_configured', async () => {
    await expect(identifyFishFromImage('abc', 'image/jpeg', { FISH_ID_API_KEY: '' })).rejects.toMatchObject({
      message: 'not_configured',
    });
  });
});

describe('fishIdAgentUrl', () => {
  it('默认打开豆包网页', () => {
    expect(fishIdAgentUrl({})).toBe('https://www.doubao.com');
  });
});
