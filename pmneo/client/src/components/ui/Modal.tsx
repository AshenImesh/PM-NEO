import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { classNames } from '@utils/helpers';
import { useClickOutside } from '@hooks/useDragAndDrop';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useClickOutside(panelRef, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-dark-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={classNames(
          'relative w-full rounded-2xl border border-dark-200 bg-white shadow-elevated animate-in max-h-[88vh] flex flex-col',
          'dark:bg-dark-900 dark:border-dark-700',
          sizeClasses[size]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-6 py-5 hairline-b">
            <div className="min-w-0">
              {title && <h2 className="text-lg font-semibold text-dark-900 dark:text-white">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-dark-500 dark:text-dark-400">{description}</p>}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog" className="px-2">
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  loading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  loading?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-dark-600 dark:text-dark-300">{message}</p>
      <div className="flex justify-end gap-2 pt-5">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
