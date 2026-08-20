import { useEffect, useRef, useSyncExternalStore } from 'react';
import { formatRelativeTime } from '../lib/caption';
import { shareCover } from '../lib/catchThumb';
import { CatchMediaBadge } from './CatchMediaBadge';
import { chatAvatarHue, chatAvatarLetter, isMyChatMessage, withChatMarkers } from '../lib/chatAvatar';
import { IMAGE_BODY, isImageBody } from '../lib/chatImage';
import { isVideoBody } from '../lib/userMedia';
import { loadChatMedia } from '../lib/chatMedia';
import { isStickerBody } from '../lib/chatStickers';
import { isVoiceBody, parseVoiceDuration } from '../lib/chatVoice';
import { loadProfile } from '../lib/meProfile';
import { isRepostBody, parseRepostBody, resolveRepost } from '../lib/shareRepost';
import { getSafety, hideByAuthor, subscribeSafety } from '../lib/userSafety';
import type { CatchReport, ChatQuote, HubChatMessage } from '../types';

export function ChatLog({
  rows,
  reports = [],
  myUserId,
  cloud,
  hint,
  unreadId,
  highlightId,
  onAvatar,
  onFollow,
  onMention,
  onReply,
  onOpenShare,
}: {
  rows: HubChatMessage[];
  reports?: CatchReport[];
  myUserId: string | null;
  cloud: boolean;
  hint?: string | null;
  unreadId?: string;
  highlightId?: string | null;
  onAvatar: (row: HubChatMessage, mine: boolean) => void;
  onFollow?: (name: string) => void;
  onMention?: (name: string) => void;
  onReply?: (row: HubChatMessage) => void;
  onOpenShare?: (report: CatchReport) => void;
}) {
  const logRef = useRef<HTMLUListElement>(null);
  const jumped = useRef(false);
  const myAvatar = loadProfile().avatarUrl;
  const safety = useSyncExternalStore(subscribeSafety, getSafety, getSafety);
  const items = withChatMarkers(hideByAuthor(rows, safety.blocks), new Date(), unreadId);

  useEffect(() => {
    jumped.current = false;
  }, [unreadId]);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    if (highlightId) {
      const hit = log.querySelector(`[data-msg-id="${CSS.escape(highlightId)}"]`);
      if (hit) {
        hit.scrollIntoView({ block: 'center' });
        return;
      }
    }
    if (!jumped.current) {
      const unread = log.querySelector('[data-unread]');
      if (unread) unread.scrollIntoView({ block: 'center' });
      else log.scrollTo({ top: log.scrollHeight });
      jumped.current = true;
      return;
    }
    log.scrollTo({ top: log.scrollHeight });
  }, [items.length, highlightId, unreadId]);

  const jumpTo = (id: string) => {
    const hit = logRef.current?.querySelector(`[data-msg-id="${CSS.escape(id)}"]`);
    hit?.scrollIntoView({ block: 'center' });
  };

  return (
    <>
      {hint ? <p className="hub-chat-hint">{hint}</p> : null}
      <ul className="hub-chat-log" ref={logRef}>
        {items.map((item) => {
          if (item.type === 'day') {
            return (
              <li key={`day-${item.key}`} className="hub-chat-day">
                <span>{item.label}</span>
              </li>
            );
          }
          if (item.type === 'unread') {
            return (
              <li key="unread" className="hub-chat-unread" data-unread>
                <span>以下为新消息</span>
              </li>
            );
          }
          const row = item.row;
          const mine = isMyChatMessage(row, myUserId, cloud);
          const hue = chatAvatarHue(row.author);
          const sticker = isStickerBody(row.body);
          const voice = isVoiceBody(row.body) || row.kind === 'voice';
          const share = isRepostBody(row.body) || row.kind === 'share';
          const photo = isImageBody(row.body) || row.kind === 'image';
          const clip = isVideoBody(row.body) || row.kind === 'video';
          return (
            <li
              key={row.id}
              className="hub-chat-row"
              data-mine={mine ? 'true' : 'false'}
              data-msg-id={row.id}
              data-hit={highlightId === row.id ? 'true' : 'false'}
            >
              <button
                type="button"
                className="hub-chat-avatar"
                style={mine && myAvatar ? undefined : { background: `hsl(${hue} 42% 28%)` }}
                aria-label={`${row.author}的头像`}
                onClick={() => onAvatar(row, mine)}
              >
                {mine && myAvatar ? <img src={myAvatar} alt="" /> : chatAvatarLetter(row.author)}
              </button>
              <div className="hub-chat-col">
                {row.replyTo ? <QuoteStrip quote={row.replyTo} onJump={jumpTo} /> : null}
                {sticker ? (
                  <button type="button" className="hub-chat-sticker" aria-label="表情">
                    {row.body.trim()}
                  </button>
                ) : voice ? (
                  <VoiceBubble row={row} />
                ) : photo ? (
                  <PhotoBubble row={row} />
                ) : clip ? (
                  <VideoBubble row={row} />
                ) : share ? (
                  <ShareCard row={row} reports={reports} mine={mine} onOpen={onOpenShare} />
                ) : (
                  <button
                    type="button"
                    className="hub-chat-bubble"
                    onClick={() => {
                      void navigator.clipboard.writeText(row.body);
                    }}
                  >
                    {mine ? null : (
                      <strong>
                        {row.author}
                        {row.source !== 'user' ? ' · 示例' : ''}
                      </strong>
                    )}
                    <p>{row.body}</p>
                    <em>{formatRelativeTime(row.createdAt)}</em>
                  </button>
                )}
                <div className="hub-chat-tools">
                  <button type="button" className="ghost" onClick={() => onReply?.(row)}>
                    回复
                  </button>
                  {mine ? null : (
                    <>
                      <button type="button" className="ghost" onClick={() => onFollow?.(row.author)}>
                        关注
                      </button>
                      <button type="button" className="ghost" onClick={() => onMention?.(row.author)}>
                        @
                      </button>
                      <button type="button" className="ghost" onClick={() => onAvatar(row, mine)}>
                        主页
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function QuoteStrip({ quote, onJump }: { quote: ChatQuote; onJump: (id: string) => void }) {
  return (
    <button type="button" className="hub-chat-quote" onClick={() => onJump(quote.id)}>
      <strong>{quote.author}</strong>
      <span>{quote.preview}</span>
    </button>
  );
}

function ShareCard({
  row,
  reports,
  mine,
  onOpen,
}: {
  row: HubChatMessage;
  reports: CatchReport[];
  mine: boolean;
  onOpen?: (report: CatchReport) => void;
}) {
  const report = resolveRepost(row.body, reports);
  const parsed = parseRepostBody(row.body);
  const author = report?.author || parsed?.author || row.author;
  const spot = report?.spotName || parsed?.spotName || '';
  const fish = report?.fish || parsed?.fish || '渔获';
  const title = report?.title || `${author}钓到了${fish}`;
  return (
    <button
      type="button"
      className="hub-chat-share"
      aria-label={report ? `打开${title}` : '原分享已不在'}
      onClick={() => {
        if (report) onOpen?.(report);
      }}
    >
      <span className="hub-chat-share-cover">
        <img src={shareCover(report ?? { fish, imageUrl: undefined })} alt="" />
        {report ? <CatchMediaBadge report={report} /> : null}
      </span>
      <span>
        {mine ? null : (
          <strong>
            {row.author}
            {row.source !== 'user' ? ' · 示例' : ''}
          </strong>
        )}
        <em>渔获分享</em>
        <b>{title}</b>
        <small>{report ? `${spot} · ${fish}` : '原分享已不在'}</small>
      </span>
    </button>
  );
}

function PhotoBubble({ row }: { row: HubChatMessage }) {
  const src = row.mediaUrl || loadChatMedia(row.id);
  return (
    <div className="hub-chat-bubble is-photo">
      {src ? (
        <a className="hub-chat-photo" href={src} target="_blank" rel="noreferrer">
          <img src={src} alt="聊天图片" />
        </a>
      ) : (
        <p>{IMAGE_BODY} · 本机未保存</p>
      )}
      <em>{formatRelativeTime(row.createdAt)}</em>
    </div>
  );
}

function VideoBubble({ row }: { row: HubChatMessage }) {
  const src = row.mediaUrl || loadChatMedia(row.id);
  return (
    <div className="hub-chat-bubble is-photo">
      {src ? (
        <video className="hub-chat-video" src={src} controls playsInline preload="metadata">
          短视频
        </video>
      ) : (
        <p>[视频] · 本机未保存</p>
      )}
      <em>{formatRelativeTime(row.createdAt)}</em>
    </div>
  );
}

function VoiceBubble({ row }: { row: HubChatMessage }) {
  const src = row.mediaUrl || loadChatMedia(row.id);
  const seconds = Math.round((row.durationMs ?? parseVoiceDuration(row.body) ?? 1000) / 1000);
  return (
    <div className="hub-chat-bubble is-voice">
      {src ? (
        <audio controls src={src} preload="metadata">
          语音
        </audio>
      ) : (
        <p>语音 {seconds}″ · 本机未保存音频</p>
      )}
      <em>{formatRelativeTime(row.createdAt)}</em>
    </div>
  );
}
