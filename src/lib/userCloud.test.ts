import { describe, expect, it } from 'vitest';
import {
  catchToRow,
  mapCatchCloudRow,
  mapCommentCloudRow,
  mapDmAllowRow,
  mapGearReviewCloudRow,
  mapNameColumn,
  mapSpotReviewCloudRow,
  mergeAllowMap,
  unionNames,
} from './userCloud';

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

  it('https 视频写入 video_url，data URL 不写', () => {
    const withHttps = catchToRow(
      {
        id: 'user-2',
        author: '阿周',
        fish: '鲈鱼',
        spotName: '滴水湖东岸',
        lon: 121.9,
        lat: 30.9,
        caughtAt: '2026-08-18T12:00:00.000Z',
        source: 'user',
        videoUrl: 'https://abc.supabase.co/storage/v1/object/public/yj-media/u/catch/c.mp4',
      },
      'uid-1',
    );
    expect(withHttps.video_url).toBe('https://abc.supabase.co/storage/v1/object/public/yj-media/u/catch/c.mp4');

    const withData = catchToRow(
      {
        id: 'user-3',
        author: '阿周',
        fish: '鲈鱼',
        spotName: '滴水湖东岸',
        lon: 121.9,
        lat: 30.9,
        caughtAt: '2026-08-18T12:00:00.000Z',
        source: 'user',
        videoUrl: 'data:video/mp4;base64,YQ==',
      },
      'uid-1',
    );
    expect(withData).not.toHaveProperty('video_url');
  });

  it('https 照片写入 image_urls，data URL 不写', () => {
    const withHttps = catchToRow(
      {
        id: 'user-4',
        author: '阿周',
        fish: '鲈鱼',
        spotName: '滴水湖东岸',
        lon: 121.9,
        lat: 30.9,
        caughtAt: '2026-08-18T12:00:00.000Z',
        source: 'user',
        imageUrl: 'https://abc.supabase.co/storage/v1/object/public/yj-media/u/catch/a.jpg',
        imageUrls: ['https://abc.supabase.co/storage/v1/object/public/yj-media/u/catch/b.jpg', 'data:image/jpeg;base64,xx'],
      },
      'uid-1',
    );
    expect(JSON.parse(String(withHttps.image_urls))).toEqual([
      'https://abc.supabase.co/storage/v1/object/public/yj-media/u/catch/a.jpg',
      'https://abc.supabase.co/storage/v1/object/public/yj-media/u/catch/b.jpg',
    ]);

    const withData = catchToRow(
      {
        id: 'user-5',
        author: '阿周',
        fish: '鲈鱼',
        spotName: '滴水湖东岸',
        lon: 121.9,
        lat: 30.9,
        caughtAt: '2026-08-18T12:00:00.000Z',
        source: 'user',
        imageUrl: 'data:image/jpeg;base64,abc',
      },
      'uid-1',
    );
    expect(withData).not.toHaveProperty('image_urls');
  });
});

describe('mapCatchCloudRow', () => {
  it('读出公开视频地址', () => {
    expect(
      mapCatchCloudRow({
        client_id: 'c1',
        author: '阿周',
        fish: '鲈鱼',
        spot_name: '滴水湖东岸',
        lon: 121.9,
        lat: 30.9,
        source: 'user',
        caught_at: '2026-08-19T12:00:00.000Z',
        video_url: 'https://abc.supabase.co/storage/v1/object/public/yj-media/u/catch/c.mp4',
      }),
    ).toMatchObject({
      id: 'c1',
      videoUrl: 'https://abc.supabase.co/storage/v1/object/public/yj-media/u/catch/c.mp4',
    });
  });

  it('丢掉 data URL 视频', () => {
    expect(
      mapCatchCloudRow({
        client_id: 'c2',
        author: '阿周',
        fish: '鲈鱼',
        spot_name: '滴水湖东岸',
        lon: 121.9,
        lat: 30.9,
        caught_at: '2026-08-19T12:00:00.000Z',
        video_url: 'data:video/mp4;base64,YQ==',
      })?.videoUrl,
    ).toBeUndefined();
  });

  it('读出公开照片地址', () => {
    expect(
      mapCatchCloudRow({
        client_id: 'c3',
        author: '阿周',
        fish: '鲈鱼',
        spot_name: '滴水湖东岸',
        lon: 121.9,
        lat: 30.9,
        caught_at: '2026-08-19T12:00:00.000Z',
        image_urls: '["https://abc.supabase.co/storage/v1/object/public/yj-media/u/catch/a.jpg"]',
      }),
    ).toMatchObject({
      id: 'c3',
      imageUrl: 'https://abc.supabase.co/storage/v1/object/public/yj-media/u/catch/a.jpg',
    });
  });
});

describe('unionNames', () => {
  it('本机与云端并集，去空白去重', () => {
    expect(unionNames(['路亚阿周', ' '], ['南汇小路', '路亚阿周'])).toEqual(['路亚阿周', '南汇小路']);
  });
});

describe('mergeAllowMap', () => {
  it('本机开关优先，补上云端独有的键', () => {
    expect(mergeAllowMap({ a: true }, { a: false, b: false })).toEqual({ a: true, b: false });
  });
});

describe('mapNameColumn', () => {
  it('读出点赞/关注/想买/拉黑的名字列', () => {
    expect(mapNameColumn({ report_id: 'xhs-1' }, 'report_id')).toBe('xhs-1');
    expect(mapNameColumn({ author_name: ' 路亚阿周 ' }, 'author_name')).toBe('路亚阿周');
    expect(mapNameColumn({ product_id: '' }, 'product_id')).toBeNull();
  });
});

describe('mapCommentCloudRow', () => {
  it('云端评论标成本机用户评论', () => {
    expect(
      mapCommentCloudRow({
        id: '11111111-1111-1111-1111-111111111111',
        report_id: 'xhs-dishui',
        author: '阿周',
        body: '这位置我也蹲过',
        created_at: '2026-08-19T12:00:00.000Z',
      }),
    ).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      postId: 'xhs-dishui',
      author: '阿周',
      body: '这位置我也蹲过',
      source: 'user',
    });
  });

  it('缺正文则丢掉', () => {
    expect(mapCommentCloudRow({ id: '1', report_id: 'x', author: '阿周', body: '  ' })).toBeNull();
  });
});

describe('mapGearReviewCloudRow', () => {
  it('用 client_id 当本机 id', () => {
    expect(
      mapGearReviewCloudRow({
        client_id: 'gear-1',
        gear_name: '竿',
        author: '阿周',
        rating: 5,
        body: '轻',
        created_at: '2026-08-19T12:00:00.000Z',
      }),
    ).toMatchObject({ id: 'gear-1', gearName: '竿', rating: 5, source: 'user' });
  });
});

describe('mapSpotReviewCloudRow', () => {
  it('用 client_id 当本机 id', () => {
    expect(
      mapSpotReviewCloudRow({
        client_id: 'spot-1',
        venue_id: 'v1',
        author: '阿周',
        rating: 4,
        body: '岸抛舒服',
        created_at: '2026-08-19T12:00:00.000Z',
      }),
    ).toMatchObject({ id: 'spot-1', venueId: 'v1', rating: 4, source: 'user' });
  });
});

describe('mapDmAllowRow', () => {
  it('读出对方键和开关', () => {
    expect(mapDmAllowRow({ peer_key: 'fan-zhang', allowed: false })).toEqual({ peerKey: 'fan-zhang', allowed: false });
    expect(mapDmAllowRow({ peer_key: '  ', allowed: true })).toBeNull();
  });
});
