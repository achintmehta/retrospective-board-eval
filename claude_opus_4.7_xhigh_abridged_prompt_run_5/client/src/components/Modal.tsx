import { useEffect } from 'react';
import type { ReactNode } from 'react';

export function Modal({
  onClose,
  children,
  closable = true,
}: {
  onClose?: () => void;
  children: ReactNode;
  closable?: boolean;
}) {
  useEffect(() => {
    if (!closable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closable, onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={closable ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
