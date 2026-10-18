import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from '../lib/cx';
import s from './forms.module.css';

type FieldProps = { label: string; hint?: string; children: (id: string) => ReactNode; className?: string };

// Rótulo + controle + dica, com o id ligando o <label> ao campo.
export function Field({ label, hint, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={cx(s.field, className)}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      {children(id)}
      {hint && <span className={s.hint}>{hint}</span>}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(s.control, className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(s.control, s.textarea, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(s.control, s.select, className)} {...props}>
      {children}
    </select>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className={s.grid}>{children}</div>;
}

// Grupo de opções exclusivas em forma de abas/segmentos (ex.: "Pessoa | Fila").
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div className={s.segmented} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={cx(s.segment, value === o.value && s.segmentActive)}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
