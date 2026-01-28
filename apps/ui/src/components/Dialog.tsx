import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Dialog({ open, onClose, title, children, maxWidth = 'md' }: DialogProps) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const portalEl = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    el.setAttribute('data-aurora-dialog-root', 'true');
    return el;
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    if (open) {
      if (portalEl) document.body.appendChild(portalEl);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      if (portalEl && portalEl.parentNode) {
        portalEl.parentNode.removeChild(portalEl);
      }
    };
  }, [open, portalEl]);

  if (!open) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  if (!portalEl) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className={`aurora-modal glass-panel-strong relative z-[9999] ${maxWidthClasses[maxWidth]} w-full max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/60">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-white/80 p-2 text-foreground/70 hover:bg-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    portalEl,
  );
}
