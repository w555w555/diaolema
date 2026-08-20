import { describe, expect, it } from 'vitest';
import { clipVoiceDuration, isVoiceBody, parseVoiceDuration, voiceBody } from './chatVoice';

describe('clipVoiceDuration', () => {
  it('rejects too short and caps at 15s', () => {
    expect(clipVoiceDuration(100)).toBeNull();
    expect(clipVoiceDuration(8000)).toBe(8000);
    expect(clipVoiceDuration(20_000)).toBe(15_000);
  });
});

describe('voiceBody', () => {
  it('round-trips the marker', () => {
    expect(voiceBody(8400)).toBe('[语音 8″]');
    expect(parseVoiceDuration('[语音 8″]')).toBe(8000);
    expect(isVoiceBody('[语音 8″]')).toBe(true);
    expect(isVoiceBody('晚上好')).toBe(false);
  });
});
