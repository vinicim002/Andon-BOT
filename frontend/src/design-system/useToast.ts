import { createContext, useContext } from 'react';

export type ToastInput = {
  message: string;
  tone?: 'success' | 'error';
  action?: { label: string; onClick: () => void };
};

export const ToastContext = createContext<((input: ToastInput) => void) | undefined>(undefined);

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast precisa estar dentro de ToastProvider');
  return toast;
}
