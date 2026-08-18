import { describe, expect, it } from 'vitest';
import { catchToRow } from './userCloud';

describe('catchToRow', () => {
  it('去掉 data URL 照片再上传', () => {
    const row = catchToRow(
      {
        id: 'user-1',
        author: '阿周',
        fish: '鲈鱼',
        spotName: '滴水湖东岸',
        lon: 121.9,
        lat: 30.9,
        caughtAt: '2026-08-18T12:00:00.000Z',
        source: 'user',
        imageUrl: 'data:image/jpeg;base64,abc',
        note: '岸抛',
      },
      'uid-1',
    );
    expect(row).toMatchObject({
      client_id: 'user-1',
      user_id: 'uid-1',
      fish: '鲈鱼',
      spot_name: '滴水湖东岸',
      source: 'user',
    });
    expect(row).not.toHaveProperty('imageUrl');
  });
});
