import { describe, expect, it } from 'vitest';
import {
  MEDIA_BUCKET,
  VIDEO_BODY,
  cloudMediaUrl,
  dataUrlToBlob,
  extFromMime,
  isVideoBody,
  mediaObjectPath,
  mediaUploadErrorMessage,
  publicMediaUrl,
} from './userMedia';

describe('isVideoBody', () => {
  it('只认 [视频]', () => {
    expect(isVideoBody(VIDEO_BODY)).toBe(true);
    expect(isVideoBody('  [视频]  ')).toBe(true);
    expect(isVideoBody('[图片]')).toBe(false);
  });
});

describe('mediaObjectPath', () => {
  it('按用户和目录拼对象路径', () => {
    expect(mediaObjectPath({ userId: 'uid-1', folder: 'chat', fileId: 'abc', ext: 'mp4' })).toBe('uid-1/chat/abc.mp4');
    expect(mediaObjectPath({ userId: 'uid-1', folder: 'catch', fileId: 'c1', ext: '.webm' })).toBe('uid-1/catch/c1.webm');
    expect(mediaObjectPath({ userId: 'uid-1', folder: 'catch', fileId: 'c1-img0', ext: 'jpg' })).toBe('uid-1/catch/c1-img0.jpg');
  });
});

describe('publicMediaUrl', () => {
  it('拼公开读取地址', () => {
    expect(publicMediaUrl('https://abc.supabase.co/', 'uid-1/chat/a.mp4')).toBe(
      `https://abc.supabase.co/storage/v1/object/public/${MEDIA_BUCKET}/uid-1/chat/a.mp4`,
    );
  });
});

describe('extFromMime', () => {
  it('按 mime 选后缀', () => {
    expect(extFromMime('video/webm')).toBe('webm');
    expect(extFromMime('video/quicktime')).toBe('mov');
    expect(extFromMime('video/mp4')).toBe('mp4');
    expect(extFromMime('image/jpeg')).toBe('jpg');
    expect(extFromMime('image/png')).toBe('png');
    expect(extFromMime('image/webp')).toBe('webp');
  });
});

describe('cloudMediaUrl', () => {
  it('只留下 http(s)，丢掉 data URL', () => {
    expect(cloudMediaUrl('https://abc.supabase.co/storage/v1/object/public/yj-media/a.mp4')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/yj-media/a.mp4',
    );
    expect(cloudMediaUrl('data:video/mp4;base64,YQ==')).toBeUndefined();
    expect(cloudMediaUrl('blob:https://example.com/1')).toBeUndefined();
    expect(cloudMediaUrl('  ')).toBeUndefined();
  });
});

describe('dataUrlToBlob', () => {
  it('把 data URL 还原成 Blob', async () => {
    const blob = dataUrlToBlob('data:video/mp4;base64,YQ==');
    expect(blob.type).toBe('video/mp4');
    expect(await blob.text()).toBe('a');
  });
});

describe('mediaUploadErrorMessage', () => {
  it('缺桶时提示跑 SQL', () => {
    expect(mediaUploadErrorMessage(new Error('Bucket not found'))).toMatch(/social\.sql/);
  });
});
