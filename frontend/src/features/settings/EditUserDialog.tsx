import { useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { Avatar, Button } from '../../design-system/components';
import { Field, Select } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import type { Id, OperationalQueue, Role, User } from '../../domain/types';
import dialogs from '../inbox/dialogs.module.css';
import { QueueToggles } from './QueueToggles';
import s from './Settings.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
  roles: Role[];
  queues: OperationalQueue[];
  onSaved: () => void;
};

export function EditUserDialog(props: Props) {
  return (
    <Modal open={props.open} onOpenChange={props.onOpenChange} title="Editar acesso" size="lg">
      {props.open && props.user && <EditUserForm {...props} user={props.user} />}
    </Modal>
  );
}

function EditUserForm({ user, roles, queues, onSaved, onOpenChange }: Props & { user: User }) {
  const [roleId, setRoleId] = useState<Id>(user.roleId);
  const [queueIds, setQueueIds] = useState<Id[]>(queues.filter((q) => q.memberIds.includes(user.id)).map((q) => q.id));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const role = roles.find((r) => r.id === roleId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.updateUser(user.id, { roleId, queueIds });
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <div className={s.userCell}>
        <Avatar name={user.name} size={40} />
        <span>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </span>
      </div>
      <Field label="Papel" hint={role?.description}>
        {(id) => (
          <Select id={id} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <QueueToggles queues={queues} value={queueIds} onChange={setQueueIds} />
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
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
