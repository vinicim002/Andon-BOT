import { useState, type FormEvent } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { api } from '../../api';
import { Avatar, Button } from '../../design-system/components';
import { Field, Segmented, TextInput } from '../../design-system/forms';
import { WhatsAppIcon } from '../../design-system/icons';
import { Modal } from '../../design-system/Modal';
import { availability } from '../../domain/labels';
import type { ChannelEndpoint, Id, OperationalQueue, QueueInput, RoutingPolicy, TagColor, User } from '../../domain/types';
import { cx } from '../../lib/cx';
import dialogs from '../inbox/dialogs.module.css';
import s from './Settings.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue?: OperationalQueue;
  users: User[];
  endpoints: ChannelEndpoint[];
  onSaved: (message: string) => void;
};

const colors: { value: TagColor; label: string }[] = [
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'orange', label: 'Laranja' },
  { value: 'red', label: 'Vermelho' },
  { value: 'purple', label: 'Roxo' },
  { value: 'cyan', label: 'Ciano' },
];

export function QueueDialog(props: Props) {
  return (
    <Modal open={props.open} onOpenChange={props.onOpenChange} title={props.queue ? `Editar fila ${props.queue.name}` : 'Nova fila'} size="lg">
      {props.open && <QueueForm {...props} />}
    </Modal>
  );
}

const toggle = (list: Id[], id: Id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

function QueueForm({ queue, users, endpoints, onSaved, onOpenChange }: Props) {
  const [input, setInput] = useState<QueueInput>(
    queue
      ? { name: queue.name, color: queue.color, routingPolicy: queue.routingPolicy, memberIds: queue.memberIds, endpointIds: queue.endpointIds, isDefault: queue.isDefault }
      : { name: '', color: 'blue', routingPolicy: 'round_robin', memberIds: [], endpointIds: [], isDefault: false },
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof QueueInput>(key: K, value: QueueInput[K]) => setInput((v) => ({ ...v, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (queue) await api.updateQueue(queue.id, input);
      else await api.createQueue(input);
      onSaved(queue ? 'Fila atualizada.' : `Fila ${input.name.trim()} criada.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <div className={s.formRow}>
        <Field label="Nome" className={s.grow}>
          {(id) => <TextInput id={id} autoFocus maxLength={40} placeholder="Ex.: Comercial" value={input.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <div>
          <span className={dialogs.fieldLabel} id="queue-color-label">
            Cor
          </span>
          <div className={dialogs.colors} role="radiogroup" aria-labelledby="queue-color-label">
            {colors.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={input.color === c.value}
                aria-label={c.label}
                title={c.label}
                className={cx(dialogs.color, input.color === c.value && dialogs.colorSelected)}
                style={{ background: `var(--tag-${c.value})` }}
                onClick={() => set('color', c.value)}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <span className={dialogs.fieldLabel}>Distribuição</span>
        <Segmented<RoutingPolicy>
          label="Distribuição"
          value={input.routingPolicy}
          onChange={(value) => set('routingPolicy', value)}
          options={[
            { value: 'round_robin', label: 'Rodízio automático' },
            { value: 'manual', label: 'Manual' },
          ]}
        />
        <p className={s.helper}>
          {input.routingPolicy === 'round_robin'
            ? 'Cada conversa que chega vai para quem está disponível e com menos atendimentos em andamento.'
            : 'As conversas ficam na fila até alguém assumir.'}
        </p>
      </div>

      <fieldset className={s.fieldset}>
        <legend className={dialogs.fieldLabel}>Equipe ({input.memberIds.length})</legend>
        <div className={s.checkGrid}>
          {users.map((u) => {
            const checked = input.memberIds.includes(u.id);
            return (
              <label key={u.id} className={cx(s.checkCard, checked && s.checkCardOn)}>
                <input type="checkbox" className="visually-hidden" checked={checked} onChange={() => set('memberIds', toggle(input.memberIds, u.id))} />
                <Avatar name={u.name} size={28} presence={u.availability} />
                <span className={s.checkText}>
                  <strong>{u.name}</strong>
                  <span>{availability[u.availability].label}</span>
                </span>
                <span className={cx(s.checkbox, checked && s.checkboxOn)} aria-hidden>
                  {checked && <Check />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={s.fieldset}>
        <legend className={dialogs.fieldLabel}>Canais que entregam nesta fila</legend>
        <div className={s.checkGrid}>
          {endpoints.map((e) => {
            const checked = input.endpointIds.includes(e.id);
            return (
              <label key={e.id} className={cx(s.checkCard, checked && s.checkCardOn)}>
                <input type="checkbox" className="visually-hidden" checked={checked} onChange={() => set('endpointIds', toggle(input.endpointIds, e.id))} />
                <span className={s.channelIcon} aria-hidden>
                  <WhatsAppIcon />
                </span>
                <span className={s.checkText}>
                  <strong>{e.name}</strong>
                  <span>{e.address}</span>
                </span>
                <span className={cx(s.checkbox, checked && s.checkboxOn)} aria-hidden>
                  {checked && <Check />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className={s.defaultToggle}>
        <input type="checkbox" checked={input.isDefault} disabled={queue?.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
        <span>
          <strong>Fila padrão</strong>
          {queue?.isDefault
            ? 'Esta já é a fila padrão. Para trocar, defina outra fila como padrão.'
            : 'Recebe conversas sem destino definido e as de filas excluídas.'}
        </span>
      </label>

      {error && (
        <p className={dialogs.contextLine} role="alert">
          <AlertCircle aria-hidden /> {error}
        </p>
      )}

      <div className={dialogs.actions}>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Salvando…' : queue ? 'Salvar' : 'Criar fila'}
        </Button>
      </div>
    </form>
  );
}
