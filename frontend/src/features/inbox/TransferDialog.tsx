import { useState } from 'react';
import { Check } from 'lucide-react';
import { Avatar, Button } from '../../design-system/components';
import { Field, Segmented, TextArea, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import type { Conversation, Id, OperationalQueue, TransferTarget, User } from '../../domain/types';
import { cx } from '../../lib/cx';
import s from './dialogs.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  users: User[];
  queues: OperationalQueue[];
  me: User;
  onConfirm: (target: TransferTarget, note: string | undefined) => void;
};

export function TransferDialog(props: Props) {
  // O conteúdo só monta com o diálogo aberto: cada abertura começa limpa.
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Transferir atendimento"
      description={`${props.conversation.contact.name} será atendido por outra pessoa ou volta para uma fila.`}
    >
      {props.open && <TransferForm {...props} />}
    </Modal>
  );
}

function TransferForm({ conversation, users, queues, me, onConfirm, onOpenChange }: Props) {
  const [kind, setKind] = useState<'user' | 'queue'>('user');
  const [userId, setUserId] = useState<Id>();
  const [queueId, setQueueId] = useState<Id>();
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');

  // Disponíveis primeiro; o atual responsável não aparece.
  const candidates = users
    .filter((u) => u.id !== conversation.assigneeId && u.id !== me.id)
    .filter((u) => !search.trim() || `${u.name} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(b.online) - Number(a.online));

  const target: TransferTarget | undefined =
    kind === 'user' ? (userId ? { kind: 'user', userId } : undefined) : queueId ? { kind: 'queue', queueId } : undefined;

  return (
    <>
      <Segmented
        label="Destino"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'user', label: 'Para uma pessoa' },
          { value: 'queue', label: 'Para uma fila' },
        ]}
      />

      {kind === 'user' ? (
        <div className={s.pickerBlock}>
          <TextInput
            type="search"
            placeholder="Nome ou e-mail de quem recebe"
            aria-label="Buscar atendente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {candidates.length === 0 ? (
            <p className={s.empty}>Não há outro atendente para receber.</p>
          ) : (
            <ul className={s.options} role="listbox" aria-label="Atendentes">
              {candidates.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={userId === u.id}
                    className={cx(s.option, userId === u.id && s.optionSelected)}
                    onClick={() => setUserId(u.id)}
                  >
                    <Avatar name={u.name} size={32} online={u.online} />
                    <span className={s.optionText}>
                      <strong>{u.name}</strong>
                      <span>{u.online ? 'Disponível' : 'Offline — recebe quando voltar'}</span>
                    </span>
                    {userId === u.id && <Check className={s.check} aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <ul className={s.options} role="listbox" aria-label="Filas">
          {queues.map((q) => (
            <li key={q.id}>
              <button
                type="button"
                role="option"
                aria-selected={queueId === q.id}
                className={cx(s.option, queueId === q.id && s.optionSelected)}
                onClick={() => setQueueId(q.id)}
              >
                <span className={cx(s.queueSwatch, s[`swatch-${q.color}`])} aria-hidden />
                <span className={s.optionText}>
                  <strong>{q.name}</strong>
                  <span>
                    {q.memberIds.length} {q.memberIds.length === 1 ? 'pessoa' : 'pessoas'} ·{' '}
                    {q.routingPolicy === 'round_robin' ? 'distribuição automática' : 'distribuição manual'}
                    {q.id === conversation.queueId && ' · fila atual'}
                  </span>
                </span>
                {queueId === q.id && <Check className={s.check} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Field label="Resumo para quem recebe" hint="Opcional. Fica como nota interna na conversa — o cliente não vê.">
        {(id) => (
          <TextArea
            id={id}
            rows={3}
            placeholder="Ex.: cliente já recebeu o orçamento; aguarda confirmação do prazo."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>

      <div className={s.actions}>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button variant="primary" disabled={!target} onClick={() => target && onConfirm(target, note || undefined)}>
          Transferir
        </Button>
      </div>
    </>
  );
}
