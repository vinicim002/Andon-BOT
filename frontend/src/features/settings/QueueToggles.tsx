import { Check } from 'lucide-react';
import type { Id, OperationalQueue } from '../../domain/types';
import { cx } from '../../lib/cx';
import dialogs from '../inbox/dialogs.module.css';
import s from './Settings.module.css';

// Seleção de filas em forma de chips liga/desliga (usada no convite e na edição de acesso).
export function QueueToggles({ queues, value, onChange }: { queues: OperationalQueue[]; value: Id[]; onChange: (ids: Id[]) => void }) {
  return (
    <fieldset className={s.fieldset}>
      <legend className={dialogs.fieldLabel}>Filas</legend>
      <div className={s.toggleChips}>
        {queues.map((q) => {
          const on = value.includes(q.id);
          return (
            <button
              key={q.id}
              type="button"
              aria-pressed={on}
              className={cx(s.toggleChip, on && s.toggleChipOn)}
              onClick={() => onChange(on ? value.filter((id) => id !== q.id) : [...value, q.id])}
            >
              {on ? <Check aria-hidden /> : <span className={s[`dot-${q.color}`]} aria-hidden />}
              {q.name}
            </button>
          );
        })}
      </div>
      <p className={s.helper}>Define quais atendimentos a pessoa recebe pelo rodízio e vê sem a permissão “Ver todos os atendimentos”.</p>
    </fieldset>
  );
}
