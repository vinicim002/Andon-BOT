import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import s from './Timeline.module.css';

export type TimelineItem = {
  id: string;
  icon: ReactNode;
  title: ReactNode;
  at: string;
  body?: ReactNode;
  // Comentários aparecem como cartão; mudanças de estado, como linha simples.
  variant?: 'event' | 'comment';
};

// Linha do tempo de auditoria: componente de domínio do design system, reaproveitado em ticket,
// conversa e (depois) workflow. Ordem cronológica, mais antigo em cima.
export function Timeline({ items, formatAt }: { items: TimelineItem[]; formatAt: (iso: string) => string }) {
  return (
    <ol className={s.timeline}>
      {items.map((item) => (
        <li key={item.id} className={cx(s.item, item.variant === 'comment' && s.comment)}>
          <span className={s.marker} aria-hidden>
            {item.icon}
          </span>
          <div className={s.content}>
            <div className={s.head}>
              <span className={s.title}>{item.title}</span>
              <time className={s.at} dateTime={item.at}>
                {formatAt(item.at)}
              </time>
            </div>
            {item.body && <div className={s.body}>{item.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
