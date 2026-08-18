import type { ReactNode } from 'react';

type Props = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Sheet({ title, open, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-dim" aria-label="关闭" onClick={onClose} />
      <div className="sheet-panel">
        <header className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="sheet-close" onClick={onClose}>
            关闭
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
