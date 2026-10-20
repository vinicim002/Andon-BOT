import { useState, type FormEvent } from 'react';
import { AlertCircle, MessagesSquare } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Button } from '../../design-system/components';
import { Field, FormGrid, Select, TextArea, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import { ticketPriority } from '../../domain/labels';
import type { Conversation, Id, Ticket, TicketPriority, User } from '../../domain/types';
import dialogs from '../inbox/dialogs.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Quando vem de uma conversa, o contato e o vínculo já estão definidos.
  conversation?: Conversation;
  users: User[];
  me: User;
  onCreated: (ticket: Ticket) => void;
};

export function NewTicketDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Abrir ticket"
      description="O protocolo é gerado automaticamente e não pode ser alterado depois."
    >
      {props.open && <NewTicketForm {...props} />}
    </Modal>
  );
}

const priorities = Object.entries(ticketPriority) as [TicketPriority, { label: string }][];

function NewTicketForm({ conversation, users, me, onCreated, onOpenChange }: Props) {
  const contacts = useQuery(api.contacts);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [assigneeId, setAssigneeId] = useState<Id>(conversation?.assigneeId ?? me.id);
  const [contactId, setContactId] = useState<Id>(conversation?.contact.id ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!subject.trim()) return setError('Informe o assunto do ticket.');
    if (!contactId) return setError('Escolha o contato.');
    setSaving(true);
    try {
      const ticket = await api.createTicket(
        { subject: subject.trim(), description: description.trim() || undefined, priority, assigneeId, contactId, conversationId: conversation?.id },
        me.id,
      );
      onCreated(ticket);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível abrir o ticket.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      {conversation ? (
        <p className={dialogs.contextLine}>
          <MessagesSquare aria-hidden /> Vinculado à conversa com <strong>{conversation.contact.name}</strong>
        </p>
      ) : (
        <Field label="Contato">
          {(id) => (
            <Select id={id} value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">Selecione…</option>
              {contacts.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.organization ? `— ${c.organization.name}` : ''}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <Field label="Assunto">
        {(id) => (
          <TextInput id={id} autoFocus placeholder="Ex.: Coleta de 12 paletes para amanhã" value={subject} onChange={(e) => setSubject(e.target.value)} />
        )}
      </Field>

      <FormGrid>
        <Field label="Prioridade">
          {(id) => (
            <Select id={id} value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
              {priorities.map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Responsável">
          {(id) => (
            <Select id={id} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id === me.id ? `${u.name} (você)` : u.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FormGrid>

      <Field label="Descrição" hint="Opcional. Contexto para quem for tratar o ticket.">
        {(id) => <TextArea id={id} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />}
      </Field>

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
          {saving ? 'Abrindo…' : 'Abrir ticket'}
        </Button>
      </div>
    </form>
  );
}
