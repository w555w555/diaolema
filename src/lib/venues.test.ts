import { describe, expect, it } from 'vitest';
import {
  DIANPING_VENUES,
  formatVenueFee,
  parseDianpingShopSnippet,
  venueAvatar,
  venueCaptionHtml,
  venueKindIcon,
  venuePinHtml,
  venueDotHtml,
  showSpotPlate,
  venueSourceLabel,
  venueMarkerTone,
  searchVenues,
} from './venues';
import seedReviews from '../data/spot-reviews.json';
import type { FishingVenue } from '../types';

describe('formatVenueFee', () => {
  it('有人均则写成 ¥N/人', () => {
    expect(formatVenueFee(177)).toBe('¥177/人');
  });

  it('没有人均则写收费未公开', () => {
    expect(formatVenueFee(null)).toBe('收费未公开');
  });
});

describe('parseDianpingShopSnippet', () => {
  it('抽出上海渔场店名、人均和营业状态', () => {
    const parsed = parseDianpingShopSnippet(
      '【漫道水上路亚营地】4.6 ¥177/人 青浦区休闲园区 营业中 沈太路',
      'https://www.dianping.com/shop/959582453',
    );
    expect(parsed?.name).toBe('漫道水上路亚营地');
    expect(parsed?.avgPriceYuan).toBe(177);
    expect(parsed?.feeLabel).toBe('¥177/人');
    expect(parsed?.status).toBe('open');
    expect(parsed?.district).toBe('青浦区');
  });

  it('外地店铺不收录', () => {
    expect(
      parseDianpingShopSnippet(
        '【荷花湾垂钓园】海淀区休闲园区',
        'https://www.dianping.com/shop/48440123',
      ),
    ).toBeNull();
  });

  it('暂停营业仍保留人均', () => {
    const parsed = parseDianpingShopSnippet(
      '【上海庆丰路德轩休闲垂钓园】¥174/人 青浦区休闲园区 暂停营业',
      'https://www.dianping.com/shop/838274043',
    );
    expect(parsed?.status).toBe('paused');
    expect(parsed?.avgPriceYuan).toBe(174);
  });
});

describe('DIANPING_VENUES', () => {
  it('上海目录覆盖点评与钓鱼之家公开营地', () => {
    expect(DIANPING_VENUES.length).toBeGreaterThanOrEqual(55);
    expect(DIANPING_VENUES.some((v) => v.name.includes('PE路亚'))).toBe(true);
    expect(DIANPING_VENUES.some((v) => v.name.includes('小凡邦'))).toBe(true);
    expect(DIANPING_VENUES.some((v) => v.name.includes('荷风'))).toBe(true);
    expect(DIANPING_VENUES.some((v) => v.name.includes('悦侬'))).toBe(true);
    const names = DIANPING_VENUES.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
    for (const venue of DIANPING_VENUES) {
      expect(venue.name.length).toBeGreaterThan(2);
      expect(venue.feeLabel.length).toBeGreaterThan(1);
      expect(venue.url).toMatch(/dianping\.com|diaoyu\.com|kklure\.com|huodong\.com/);
      expect(venue.lon).toBeGreaterThan(120);
      expect(venue.lat).toBeGreaterThan(30);
    }
  });
});

describe('searchVenues', () => {
  it('按店名或区县过滤', () => {
    const hits = searchVenues(DIANPING_VENUES, '荷风');
    expect(hits.some((venue) => venue.name.includes('荷风'))).toBe(true);
    expect(searchVenues(DIANPING_VENUES, '奉贤区').every((venue) => venue.district === '奉贤区')).toBe(true);
    expect(searchVenues(DIANPING_VENUES, '')).toHaveLength(DIANPING_VENUES.length);
  });
});

describe('spot review seed', () => {
  it('每个钓场都有虚拟反馈，且用网上公开照片当头像', () => {
    const byVenue = new Map<string, number>();
    for (const row of seedReviews.reviews) {
      byVenue.set(row.venueId, (byVenue.get(row.venueId) ?? 0) + 1);
    }
    for (const venue of DIANPING_VENUES) {
      expect(byVenue.get(venue.id) ?? 0).toBeGreaterThanOrEqual(1);
    }
    expect(seedReviews.reviews.some((row) => row.imageUrl?.startsWith('/spot-photos/'))).toBe(true);
  });
});

const sample: FishingVenue = {
  id: 'dy-pe',
  shopId: '242217',
  name: '上海PE路亚营地',
  district: '奉贤区',
  addressHint: '庄行镇渔沥村规划一路',
  kind: '路亚营地',
  avgPriceYuan: 158,
  feeLabel: '158元/天',
  status: 'unknown',
  statusLabel: '状态未公开',
  catalogSource: 'diaoyu',
  lon: 121.392,
  lat: 30.905,
  url: 'https://m.diaoyu.com/diaochang/shanghai/242217.html',
};

describe('venue map markup', () => {
  it('标点是分类铭牌，含店名、区县收费与五星，无照片用 Logo', () => {
    const html = venuePinHtml(sample, 4.3);
    expect(html).toContain('上海PE路亚营地');
    expect(html).toContain('奉贤区');
    expect(html).toContain('158元/天');
    expect(html).toContain('/logo.svg');
    expect(html).toContain('data-logo="true"');
    expect(html).toContain('spot-marker-name');
    expect(html).toContain('spot-stars-view');
    expect(html).toContain('data-fill="full"');
    expect(html).toContain('data-fill="half"');
    expect(html).not.toContain('4.3');
    expect(html).toContain('spot-marker');
    expect(html).toContain('spot-marker-plate');
    expect(html).toContain('data-tone="lure"');
    expect(html).toContain('路亚');
    expect(html).toContain('spot-marker-kind');
    expect(html).not.toContain('score-pin');
  });

  it('有反馈图时头像用该图，不用 Logo', () => {
    const html = venuePinHtml(sample, 4, '/venue-icons/lure.svg');
    expect(html).toContain('/venue-icons/lure.svg');
    expect(html).toContain('data-logo="false"');
    expect(html).not.toContain('/logo.svg');
  });

  it('无反馈时钉上显示新和空星', () => {
    const html = venuePinHtml(sample, null);
    expect(html).toContain('新');
    expect(html).toContain('data-fill="empty"');
    expect(venueAvatar()).toBe('/logo.svg');
  });

  it('拉远时用小头像钉，靠近后才展开铭牌', () => {
    expect(showSpotPlate(12)).toBe(false);
    expect(showSpotPlate(13)).toBe(true);
    const dot = venueDotHtml(sample);
    expect(dot).toContain('spot-dot');
    expect(dot).toContain('/logo.svg');
    expect(dot).toContain('上海PE路亚营地');
    expect(dot).not.toContain('158元/天');
  });

  it('按钓场类型区分路亚、海钓、池塘铭牌', () => {
    expect(venueMarkerTone('路亚营地')).toBe('lure');
    expect(venueMarkerTone('路亚垂钓园')).toBe('lure');
    expect(venueMarkerTone('海钓场')).toBe('sea');
    expect(venueMarkerTone('垂钓园')).toBe('pond');
    expect(venuePinHtml({ ...sample, kind: '海钓场' }, 5)).toContain('data-tone="sea"');
    expect(venuePinHtml({ ...sample, kind: '海钓场' }, 5)).toContain('海钓');
    expect(venuePinHtml({ ...sample, kind: '垂钓园' }, 4)).toContain('池塘');
  });

  it('弹窗带图标和钓鱼之家来源，不写打开点评', () => {
    expect(venueSourceLabel('diaoyu')).toBe('钓鱼之家');
    expect(venueKindIcon(sample)).toContain('data:image/svg+xml;base64,');
    expect(venueKindIcon({ kind: '海钓场', status: 'unknown' })).toContain('data:image/svg+xml;base64,');
    expect(venueKindIcon({ kind: '路亚营地', status: 'closed' })).not.toBe(venueKindIcon(sample));
    const html = venueCaptionHtml(sample);
    expect(html).toContain('data:image/svg+xml;base64,');
    expect(html).toContain('钓鱼之家');
    expect(html).not.toContain('打开钓场');
    expect(html).not.toContain('打开点评');
    expect(html).toContain('data-vid="dy-pe"');
  });
});
