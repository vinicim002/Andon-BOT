import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Copy, ShieldAlert } from 'lucide-react';
import { api } from '../../api';
import { Button } from '../../design-system/components';
import { Field, FormGrid, Select, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import type { Id, OperationalQueue, Role, User } from '../../domain/types';
import dialogs from '../inbox/dialogs.module.css';
import { inviteLink } from './inviteLink';
import { QueueToggles } from './QueueToggles';
import s from './Settings.module.css';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; roles: Role[]; queues: OperationalQueue[]; me: User };

export function InviteDialog(props: Props) {
  return (
    <Modal open={props.open} onOpenChange={props.onOpenChange} title="Convidar usuário" description="A pessoa recebe um link para criar a senha e entrar." size="lg">
      {props.open && <InviteFlow {...props} />}
    </Modal>
  );
}

function InviteFlow({ roles, queues, me, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<Id>(roles.find((r) => r.id === 'r-agent')?.id ?? roles[0].id);
  const [queueIds, setQueueIds] = useState<Id[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<User>();
  const [copied, setCopied] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      setCreated(await api.invite({ name, email, roleId, queueIds }, me.id));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível criar o convite.');
    } finally {
      setSaving(false);
    }
  };

  if (created?.invite) {
    const link = inviteLink(created.invite.token);
    return (
      <>
        <p className={s.inviteSuccess}>
          <CheckCircle2 aria-hidden /> Convite criado para <strong>{created.name}</strong>.
        </p>
        <Field label="Link de ativação">
          {(id) => (
            <div className={s.linkRow}>
              <TextInput id={id} readOnly value={link} onFocus={(e) => e.target.select()} />
              <Button
                icon={<Copy />}
                onClick={async () => {
                  await navigator.clipboard.writeText(link).catch(() => undefined);
                  setCopied(true);
                }}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          )}
        </Field>
        <p className={s.securityNote}>
          <ShieldAlert aria-hidden />
          <span>
            Entregue o link somente para <strong>{created.email}</strong>. Ele vale por 7 dias e só pode ser usado uma vez.
          </span>
        </p>
        <div className={dialogs.actions}>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        </div>
      </>
    );
  }

  const role = roles.find((r) => r.id === roleId);

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <FormGrid>
        <Field label="Nome">{(id) => <TextInput id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="E-mail">{(id) => <TextInput id={id} type="email" placeholder="pessoa@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
      </FormGrid>
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
          {saving ? 'Criando…' : 'Criar convite'}
        </Button>
      </div>
    </form>
  );
}
