import { useCallback, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cx } from '../lib/cx';
import { ToastContext, type ToastInput } from './useToast';
import s from './overlays.module.css';

type ToastItem = ToastInput & { id: number };

let nextId = 1;

// Avisos curtos de confirmação/erro no canto da tela. Região aria-live: leitores de tela anunciam.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-2), { ...input, id }]);
      setTimeout(() => dismiss(id), input.tone === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={s.toasts} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cx(s.toast, t.tone === 'error' && s.toastError)}>
            {t.tone === 'error' ? <AlertCircle aria-hidden /> : <CheckCircle2 aria-hidden />}
            <span className={s.toastText}>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className={s.toastAction}
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className={s.toastClose} onClick={() => dismiss(t.id)} aria-label="Fechar aviso">
              <X />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
