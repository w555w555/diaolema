import { describe, expect, it } from 'vitest';
import { readAmapConfig } from './mapConfig';

describe('readAmapConfig', () => {
  it('认 VITE_ 前缀', () => {
    expect(readAmapConfig({ VITE_AMAP_KEY: ' abc ', VITE_AMAP_SECURITY_CODE: 's' })).toEqual({
      key: 'abc',
      security: 's',
    });
  });

  it('认无前缀别名，方便云端变量名', () => {
    expect(readAmapConfig({ AMAP_KEY: 'k2', AMAP_SECURITY_CODE: 'sec' })).toEqual({
      key: 'k2',
      security: 'sec',
    });
  });

  it('都空则为空串', () => {
    expect(readAmapConfig({})).toEqual({ key: '', security: '' });
  });
});
