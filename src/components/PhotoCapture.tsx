import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { snapshotVideo, stopStream } from '../lib/photo';

type Props = {
  onPick: (file: File) => void;
  onPickMany?: (files: File[]) => void;
  cameraLabel?: string;
  albumLabel?: string;
  showAlbum?: boolean;
  cameraClassName?: string;
  multiple?: boolean;
};

function pickFiles(input: HTMLInputElement, onOne: (file: File) => void, onMany?: (files: File[]) => void) {
  const files = [...(input.files ?? [])];
  input.value = '';
  if (!files.length) return;
  if (onMany && files.length > 1) {
    onMany(files);
    return;
  }
  onOne(files[0]);
}

export function PhotoCapture({
  onPick,
  onPickMany,
  cameraLabel = '拍照',
  albumLabel = '相册',
  showAlbum = true,
  cameraClassName,
  multiple = false,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => () => stopStream(streamRef.current), []);

  const closeLive = () => {
    stopStream(stream);
    setStream(null);
  };

  const openCamera = async () => {
    setLiveError(null);
    if (typeof window !== 'undefined' && window.isSecureContext && navigator.mediaDevices?.getUserMedia) {
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        });
        setStream(next);
        return;
      } catch {
        setLiveError('无法打开实时镜头，改用系统相机');
      }
    }
    cameraRef.current?.click();
  };

  const bindVideo = (node: HTMLVideoElement | null) => {
    if (!node || !stream) return;
    node.srcObject = stream;
    void node.play().catch(() => undefined);
  };

  const shutter = async () => {
    const video = document.querySelector<HTMLVideoElement>('.camera-video');
    if (!video) return;
    try {
      const file = await snapshotVideo(video);
      closeLive();
      onPick(file);
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : '拍照失败');
    }
  };

  const host = typeof document !== 'undefined' ? document.querySelector('.phone') : null;

  return (
    <div className="photo-capture">
      <button type="button" className={cameraClassName} onClick={() => void openCamera()}>
        {cameraLabel}
      </button>
      {showAlbum ? (
        <button type="button" className="ghost" onClick={() => albumRef.current?.click()}>
          {albumLabel}
        </button>
      ) : null}
      {liveError && !stream ? <p className="muted photo-capture-hint">{liveError}</p> : null}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          closeLive();
          pickFiles(e.currentTarget, onPick, onPickMany);
        }}
      />
      <input
        ref={albumRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => pickFiles(e.currentTarget, onPick, onPickMany)}
      />
      {stream && host
        ? createPortal(
            <div className="camera-overlay" role="dialog" aria-label="拍照">
              <button type="button" className="camera-back" onClick={closeLive}>
                <span aria-hidden>‹</span>
                返回
              </button>
              <video ref={bindVideo} className="camera-video" playsInline muted autoPlay />
              {liveError ? <p className="camera-overlay-error">{liveError}</p> : null}
              <div className="camera-bar">
                <span />
                <button type="button" className="camera-shutter" onClick={() => void shutter()}>
                  拍摄
                </button>
                <button type="button" className="ghost" onClick={() => cameraRef.current?.click()}>
                  系统相机
                </button>
              </div>
            </div>,
            host,
          )
        : null}
    </div>
  );
}
