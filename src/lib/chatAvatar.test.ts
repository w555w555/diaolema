import { describe, expect, it } from 'vitest';
import {
  chatAvatarHue,
  chatAvatarLetter,
  chatDayLabel,
  isMyChatMessage,
  withChatDayMarkers,
  withChatMarkers,
} from './chatAvatar';

describe('chatAvatarLetter', () => {
  it('takes the last character, empty falls back', () => {
    expect(chatAvatarLetter('阿周')).toBe('周');
    expect(chatAvatarLetter('  ')).toBe('钓');
  });
});

describe('chatAvatarHue', () => {
  it('is stable for the same name', () => {
    expect(chatAvatarHue('阿周')).toBe(chatAvatarHue('阿周'));
    expect(chatAvatarHue('阿周')).not.toBe(chatAvatarHue('老张'));
  });
});

describe('isMyChatMessage', () => {
  it('cloud matches user id; local matches user source', () => {
    expect(isMyChatMessage({ userId: 'u1', source: 'user' }, 'u1', true)).toBe(true);
    expect(isMyChatMessage({ userId: 'u2', source: 'user' }, 'u1', true)).toBe(false);
    expect(isMyChatMessage({ source: 'user' }, null, false)).toBe(true);
    expect(isMyChatMessage({ source: 'seed' }, null, false)).toBe(false);
  });
});

describe('chatDayLabel', () => {
  it('uses 今天 / 昨天 / month-day', () => {
    const now = new Date(2026, 7, 19, 12, 0, 0);
    expect(chatDayLabel(new Date(2026, 7, 19, 8, 0, 0).toISOString(), now)).toBe('今天');
    expect(chatDayLabel(new Date(2026, 7, 18, 8, 0, 0).toISOString(), now)).toBe('昨天');
    expect(chatDayLabel(new Date(2026, 6, 1, 8, 0, 0).toISOString(), now)).toBe('7月1日');
  });
});

describe('withChatDayMarkers', () => {
  it('inserts one day marker per calendar day', () => {
    const now = new Date(2026, 7, 19, 12, 0, 0);
    const items = withChatDayMarkers(
      [
        {
          id: 'a',
          roomId: 'room-lure',
          author: '阿周',
          body: '早',
          createdAt: new Date(2026, 7, 18, 10, 0, 0).toISOString(),
          source: 'seed',
        },
        {
          id: 'b',
          roomId: 'room-lure',
          author: '阿周',
          body: '晚',
          createdAt: new Date(2026, 7, 19, 10, 0, 0).toISOString(),
          source: 'user',
        },
      ],
      now,
    );
    expect(items.filter((item) => item.type === 'day').map((item) => item.label)).toEqual(['昨天', '今天']);
    expect(items.filter((item) => item.type === 'msg')).toHaveLength(2);
  });
});

describe('withChatMarkers', () => {
  it('在未读那条前插入分隔', () => {
    const now = new Date(2026, 7, 19, 12, 0, 0);
    const items = withChatMarkers(
      [
        {
          id: 'a',
          roomId: 'room-lure',
          author: '阿周',
          body: '旧',
          createdAt: new Date(2026, 7, 19, 9, 0, 0).toISOString(),
          source: 'seed',
        },
        {
          id: 'b',
          roomId: 'room-lure',
          author: '阿周',
          body: '新',
          createdAt: new Date(2026, 7, 19, 10, 0, 0).toISOString(),
          source: 'seed',
        },
      ],
      now,
      'b',
    );
    expect(items.map((item) => item.type)).toEqual(['day', 'msg', 'unread', 'msg']);
  });
});
