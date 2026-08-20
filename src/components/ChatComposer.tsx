import { useEffect, useRef, useState } from 'react';
import { fileToChatImage } from '../lib/chatImage';
import { CHAT_BODY_MAX } from '../lib/hubChat';
import { CHAT_STICKERS } from '../lib/chatStickers';
import { blobToDataUrl, clipVoiceDuration, VOICE_MAX_MS, voiceBody } from '../lib/chatVoice';
import { readVideoDurationMs } from '../lib/catchMedia';
import type { ChatQuote } from '../types';

type Props = {
  canSend: boolean;
  sending: boolean;
  placeholder: string;
  quote?: ChatQuote | null;
  onClearQuote?: () => void;
  onNeedLogin?: () => void;
  onSendText: (body: string) => Promise<void> | void;
  onSendSticker: (glyph: string) => Promise<void> | void;
  onSendVoice: (durationMs: number, dataUrl: string) => Promise<void> | void;
  onSendImage: (dataUrl: string) => Promise<void> | void;
  onSendVideo: (file: File, durationMs: number) => Promise<void> | void;
};

export function ChatComposer({
  canSend,
  sending,
  placeholder,
  quote,
  onClearQuote,
  onNeedLogin,
  onSendText,
  onSendSticker,
  onSendVoice,
  onSendImage,
  onSendVideo,
}: Props) {
  const [draft, setDraft] = useState('');
  const [stickers, setStickers] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startedRef.current);
    }, 200);
    return () => window.clearInterval(timer);
  }, [recording]);

  const stopRec = () => {
    recRef.current?.stop();
  };

  const startRec = async () => {
    if (!canSend) {
      onNeedLogin?.();
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    chunksRef.current = [];
    startedRef.current = Date.now();
    rec.ondataavailable = (ev) => {
      if (ev.data.size) chunksRef.current.push(ev.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      recRef.current = null;
      streamRef.current = null;
      setRecording(false);
      const ms = Date.now() - startedRef.current;
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
      if (!clipVoiceDuration(ms)) return;
      void blobToDataUrl(blob).then((url) => onSendVoice(ms, url));
    };
    rec.start();
    recRef.current = rec;
    setElapsed(0);
    setRecording(true);
    window.setTimeout(() => {
      if (recRef.current === rec && rec.state !== 'inactive') rec.stop();
    }, VOICE_MAX_MS);
  };

  return (
    <div className="hub-composer">
      {quote ? (
        <div className="hub-chat-quote-bar">
          <span>
            回复 {quote.author}：{quote.preview}
          </span>
          <button type="button" className="ghost" onClick={() => onClearQuote?.()}>
            取消
          </button>
        </div>
      ) : null}
      {stickers ? (
        <div className="hub-stickers" role="listbox" aria-label="表情包">
          {CHAT_STICKERS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.name}
              disabled={!canSend || sending}
              onClick={() => {
                void onSendSticker(item.glyph);
                setStickers(false);
              }}
            >
              {item.glyph}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="hub-chat-form"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!canSend) {
            onNeedLogin?.();
            return;
          }
          const text = draft.trim();
          if (!text) return;
          void Promise.resolve(onSendText(text)).then(() => setDraft(''));
        }}
      >
        <button
          type="button"
          className="ghost"
          disabled={sending}
          onClick={() => {
            if (!canSend) {
              onNeedLogin?.();
              return;
            }
            setStickers((open) => !open);
          }}
        >
          表情
        </button>
        <button
          type="button"
          className="ghost"
          disabled={sending}
          onClick={() => {
            if (!canSend) {
              onNeedLogin?.();
              return;
            }
            fileRef.current?.click();
          }}
        >
          图
        </button>
        <button
          type="button"
          className="ghost"
          disabled={sending}
          onClick={() => {
            if (!canSend) {
              onNeedLogin?.();
              return;
            }
            videoRef.current?.click();
          }}
        >
          视频
        </button>
        <input
          ref={fileRef}
          className="hub-chat-file"
          type="file"
          accept="image/*"
          hidden
          onChange={(ev) => {
            const file = ev.target.files?.[0];
            ev.target.value = '';
            if (!file) return;
            void fileToChatImage(file)
              .then((url) => onSendImage(url))
              .catch(() => undefined);
          }}
        />
        <input
          ref={videoRef}
          className="hub-chat-file"
          type="file"
          accept="video/*"
          hidden
          onChange={(ev) => {
            const file = ev.target.files?.[0];
            ev.target.value = '';
            if (!file) return;
            void readVideoDurationMs(file)
              .then((ms) => onSendVideo(file, ms))
              .catch(() => undefined);
          }}
        />
        <input
          value={draft}
          maxLength={CHAT_BODY_MAX}
          disabled={!canSend}
          onChange={(ev) => setDraft(ev.target.value)}
          placeholder={placeholder}
        />
        {canSend ? (
          <>
            <button
              type="button"
              className={recording ? 'active' : 'ghost'}
              disabled={sending}
              onClick={() => {
                if (recording) stopRec();
                else void startRec().catch(() => undefined);
              }}
            >
              {recording ? `${Math.max(1, Math.round(elapsed / 1000))}″` : '语音'}
            </button>
            <button type="submit" disabled={sending || !draft.trim()}>
              发送
            </button>
          </>
        ) : (
          <button type="button" onClick={() => onNeedLogin?.()}>
            去登录
          </button>
        )}
      </form>
      {recording ? <p className="muted">松手前再点一次「语音」发送，最长 15 秒。{voiceBody(Math.max(elapsed, 400))}</p> : null}
    </div>
  );
}
