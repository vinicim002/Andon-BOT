import type { ReactNode } from 'react';
import { Button } from './components';
import { Modal } from './Modal';
import s from './overlays.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
};

// Confirmação para ações destrutivas ou irreversíveis: explica a consequência antes de agir.
export function ConfirmDialog({ open, onOpenChange, title, children, confirmLabel, onConfirm, destructive }: Props) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <div className={s.confirmText}>{children}</div>
      <div className={s.confirmActions}>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button variant="primary" className={destructive ? s.destructive : undefined} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
