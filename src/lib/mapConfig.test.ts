import { describe, expect, it } from 'vitest';
import { mergeAmapConfig, readAmapConfig, withTimeout } from './mapConfig';

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

  it('运行期配置可补上构建期空 Key', () => {
    expect(mergeAmapConfig({ key: '', security: '' }, { key: ' live ', security: 'js' })).toEqual({
      key: 'live',
      security: 'js',
    });
  });

  it('超时未完成则拒绝，避免地图一直转圈', async () => {
    await expect(withTimeout(new Promise(() => {}), 20, '高德 SDK 超时')).rejects.toThrow('高德 SDK 超时');
  });

  it('按时完成则返回原值', async () => {
    await expect(withTimeout(Promise.resolve(7), 100, '高德 SDK 超时')).resolves.toBe(7);
  });
});
