import { useRef, useState } from 'react';
import { PhotoCapture } from './PhotoCapture';
import { compressImageFile } from '../lib/fishId/client';
import { packedToDataUrl } from '../lib/photo';
import { reportSpotName } from '../lib/reportSpot';
import { CATCH_IMAGE_MAX, catchVideoError, clipCatchImages, readVideoDurationMs } from '../lib/catchMedia';
import { blobToDataUrl } from '../lib/chatVoice';
import type { CatchReport } from '../types';

type Props = {
  lat: number;
  lon: number;
  locating?: boolean;
  picking: boolean;
  onTogglePick: () => void;
  onSubmit: (input: Omit<CatchReport, 'id' | 'source' | 'caughtAt'>) => void;
};

export function ReportForm({ lat, lon, locating, picking, onTogglePick, onSubmit }: Props) {
  const [author, setAuthor] = useState('我');
  const [fish, setFish] = useState('鲫鱼');
  const [spotName, setSpotName] = useState('');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [spotError, setSpotError] = useState<string | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const addFiles = async (files: File[]) => {
    setPhotoError(null);
    const room = CATCH_IMAGE_MAX - images.length;
    const picked = files.filter((file) => file.type.startsWith('image/') || file.type === '').slice(0, room);
    if (!picked.length) {
      if (images.length >= CATCH_IMAGE_MAX) setPhotoError('最多 9 张图');
      return;
    }
    try {
      const next = await Promise.all(
        picked.map(async (file) => packedToDataUrl(await compressImageFile(file))),
      );
      setImages((current) => clipCatchImages([...current, ...next]));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : '图片无法使用');
    }
  };

  const addVideo = async (file: File) => {
    setPhotoError(null);
    try {
      const durationMs = await readVideoDurationMs(file);
      const error = catchVideoError(file, durationMs);
      if (error) {
        setPhotoError(error);
        return;
      }
      setVideoUrl(await blobToDataUrl(file));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : '视频无法使用');
    }
  };

  return (
    <form
      className="panel report-form"
      onSubmit={(e) => {
        e.preventDefault();
        const spot = reportSpotName(spotName);
        if (!spot) {
          setSpotError('请填写钓点，例如滴水湖东岸');
          return;
        }
        setSpotError(null);
        onSubmit({
          author: author.trim() || '我',
          fish: fish.trim() || '鲫鱼',
          spotName: spot,
          lon,
          lat,
          note: note.trim() || undefined,
          imageUrl: images[0],
          imageUrls: images.slice(1),
          videoUrl,
        });
        setNote('');
        setImages([]);
        setVideoUrl(undefined);
      }}
    >
      <header>
        <h2>报渔获</h2>
        <button type="button" className={picking ? 'active' : 'ghost'} onClick={onTogglePick}>
          {picking ? '选点中' : '地图选点'}
        </button>
      </header>
      <div className="fish-id-actions">
        <PhotoCapture
          multiple
          onPick={(file) => void addFiles([file])}
          onPickMany={(files) => void addFiles(files)}
        />
        <button type="button" className="ghost" onClick={() => videoInput.current?.click()}>
          短视频
        </button>
        <input
          ref={videoInput}
          type="file"
          accept="video/*"
          hidden
          onChange={(ev) => {
            const file = ev.currentTarget.files?.[0];
            ev.currentTarget.value = '';
            if (file) void addVideo(file);
          }}
        />
      </div>
      {images.length || videoUrl ? (
        <ul className="catch-media-draft">
          {images.map((url, index) => (
            <li key={`${url}-${index}`}>
              <img src={url} alt="" />
              <button
                type="button"
                className="ghost"
                onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
              >
                去掉
              </button>
            </li>
          ))}
          {videoUrl ? (
            <li>
              <video src={videoUrl} muted playsInline />
              <button type="button" className="ghost" onClick={() => setVideoUrl(undefined)}>
                去掉视频
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
      {photoError ? <p className="error">{photoError}</p> : null}
      <p className="muted">最多 9 张图，或一条 15 秒短视频。登录后视频会上传，别人点开就能播。</p>
      <label>
        昵称
        <input value={author} onChange={(e) => setAuthor(e.target.value)} />
      </label>
      <label>
        钓点
        <input
          value={spotName}
          onChange={(e) => {
            setSpotName(e.target.value);
            if (spotError) setSpotError(null);
          }}
          placeholder="例如 滴水湖东岸"
        />
      </label>
      {spotError ? <p className="error">{spotError}</p> : null}
      <label>
        鱼种
        <input value={fish} onChange={(e) => setFish(e.target.value)} />
      </label>
      <label>
        附注
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="饵、钓法，可选" />
      </label>
      <p className="muted coords">{locating ? '正在定位…' : `${lat.toFixed(5)}, ${lon.toFixed(5)}`}</p>
      <button type="submit">上报渔获</button>
    </form>
  );
}
