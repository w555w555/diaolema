import { useState } from 'react';
import { PhotoCapture } from './PhotoCapture';
import { compressImageFile } from '../lib/fishId/client';
import { packedToDataUrl } from '../lib/photo';
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
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState<string | null>(null);

  const takePhoto = async (file: File) => {
    setPhotoError(null);
    try {
      setPreview(URL.createObjectURL(file));
      const packed = await compressImageFile(file);
      setImageUrl(packedToDataUrl(packed));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : '图片无法使用');
    }
  };

  return (
    <form
      className="panel report-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!spotName.trim()) return;
        onSubmit({
          author: author.trim() || '我',
          fish: fish.trim() || '鲫鱼',
          spotName: spotName.trim(),
          lon,
          lat,
          note: note.trim() || undefined,
          imageUrl,
        });
        setNote('');
      }}
    >
      <header>
        <h2>报渔获</h2>
        <button type="button" className={picking ? 'active' : 'ghost'} onClick={onTogglePick}>
          {picking ? '选点中' : '地图选点'}
        </button>
      </header>
      <div className="fish-id-actions">
        <PhotoCapture onPick={(file) => void takePhoto(file)} />
      </div>
      {preview ? <img className="fish-id-preview" src={preview} alt="渔获预览" /> : null}
      {photoError ? <p className="error">{photoError}</p> : null}
      <label>
        昵称
        <input value={author} onChange={(e) => setAuthor(e.target.value)} />
      </label>
      <label>
        钓点
        <input value={spotName} onChange={(e) => setSpotName(e.target.value)} placeholder="例如 滴水湖东岸" />
      </label>
      <label>
        鱼种
        <input value={fish} onChange={(e) => setFish(e.target.value)} />
      </label>
      <label>
        附注
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="饵、钓法，可选" />
      </label>
      <p className="muted coords">{locating ? '正在定位…' : `${lat.toFixed(5)}, ${lon.toFixed(5)}`}</p>
      <button type="submit">钉到地图上</button>
    </form>
  );
}
