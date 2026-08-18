import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { DEFAULT_INGEST_CONFIG } from '../ingest/config';
import { fetchPageTextWithDefuddle, resetDefuddleMissing, tryDefuddleParse } from './extractPublic';

function fakeSpawn(output: string, code = 0, errorCode?: string) {
  return ((_command: string, _args: string[]) => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      kill: () => void;
    };
    child.stdout = new EventEmitter();
    child.kill = () => undefined;
    queueMicrotask(() => {
      if (errorCode) {
        const err = Object.assign(new Error(errorCode), { code: errorCode });
        child.emit('error', err);
        return;
      }
      child.stdout.emit('data', output);
      child.emit('close', code);
    });
    return child;
  }) as unknown as typeof import('node:child_process').spawn;
}

describe('tryDefuddleParse', () => {
  it('成功时返回正文', async () => {
    resetDefuddleMissing();
    const text = await tryDefuddleParse('https://www.bilibili.com/video/1', {
      spawnFn: fakeSpawn('# 崇明 鲈鱼'),
    });
    expect(text).toContain('鲈鱼');
  });

  it('命令不存在时返回空', async () => {
    resetDefuddleMissing();
    const text = await tryDefuddleParse('https://www.bilibili.com/video/1', {
      spawnFn: fakeSpawn('', 1, 'ENOENT'),
    });
    expect(text).toBe('');
  });
});

describe('fetchPageTextWithDefuddle', () => {
  it('登录墙不调用 defuddle 也不请求页面', async () => {
    resetDefuddleMissing();
    let spawned = false;
    let fetched = false;
    const text = await fetchPageTextWithDefuddle(
      'https://www.xiaohongshu.com/explore/1',
      DEFAULT_INGEST_CONFIG,
      {
        spawnFn: ((..._args: unknown[]) => {
          spawned = true;
          return fakeSpawn('should not run')('defuddle', []);
        }) as unknown as typeof import('node:child_process').spawn,
        fetchImpl: async () => {
          fetched = true;
          return new Response('nope');
        },
      },
    );
    expect(text).toBe('');
    expect(spawned).toBe(false);
    expect(fetched).toBe(false);
  });
});
