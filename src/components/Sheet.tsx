import { useEffect, useRef, type ReactNode } from 'react';
import { pushSheet } from '../lib/sheetStack';

/** 화면 아래에서 올라오는 시트. 토스 뒤로가기·배경·✕로 닫혀요 (2026-10-18) */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    return pushSheet(() => closeRef.current());
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" className="sheet-dim" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-head">
          {title ? <h3>{title}</h3> : <span />}
          <button type="button" aria-label="닫기" className="sheet-x" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** 광고 전에 꼭 물어보는 시트 — [다음에]는 그냥 닫히고, [광고 보기]를 눌러야만 광고가 나와요 */
export function ConfirmSheet({ open, desc, onConfirm, onClose }: { open: boolean; desc: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="짧은 광고를 볼까요?">
      <p className="sheet-desc">{desc}</p>
      <div className="sheet-btns">
        <button type="button" className="sheet-cancel" onClick={onClose}>다음에</button>
        <button type="button" className="sheet-ok" onClick={onConfirm}>광고 보기</button>
      </div>
    </Sheet>
  );
}
