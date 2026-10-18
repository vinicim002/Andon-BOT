import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { cx } from '../lib/cx';
import s from './overlays.module.css';

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
};

// Diálogo modal acessível (foco preso, Esc fecha, título anunciado) sobre o Radix Dialog.
export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content className={cx(s.modal, size === 'lg' && s.modalLg)}>
          <header className={s.modalHeader}>
            <div>
              <Dialog.Title className={s.modalTitle}>{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className={s.modalDescription}>{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="visually-hidden">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className={s.modalClose} aria-label="Fechar">
              <X />
            </Dialog.Close>
          </header>
          <div className={s.modalBody}>{children}</div>
          {footer && <footer className={s.modalFooter}>{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
