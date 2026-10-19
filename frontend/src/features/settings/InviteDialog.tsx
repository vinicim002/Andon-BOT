import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, MailCheck, X } from 'lucide-react';
import { api } from '../../api';
import { Button } from '../../design-system/components';
import { Field, Select, TextArea } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import type { Id, InviteResult, OperationalQueue, Role, User } from '../../domain/types';
import { cx } from '../../lib/cx';
import dialogs from '../inbox/dialogs.module.css';
import { inviteLink } from './inviteLink';
import { QueueToggles } from './QueueToggles';
import s from './Settings.module.css';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; roles: Role[]; queues: OperationalQueue[]; me: User };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Aceita e-mails colados de qualquer jeito: vírgula, ponto e vírgula, espaço ou quebra de linha.
const parseEmails = (text: string) => [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];

export function InviteDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Convidar pessoas"
      description="Cada pessoa recebe um e-mail para criar a senha e entrar. O nome ela confirma na ativação."
      size="lg"
    >
      {props.open && <InviteFlow {...props} />}
    </Modal>
  );
}

function InviteFlow({ roles, queues, me, onOpenChange }: Props) {
  const [text, setText] = useState('');
  const [roleId, setRoleId] = useState<Id>(roles.find((r) => r.id === 'r-agent')?.id ?? roles[0].id);
  const [queueIds, setQueueIds] = useState<Id[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<InviteResult>();

  const emails = parseEmails(text);
  const invalid = emails.filter((e) => !EMAIL.test(e));
  const role = roles.find((r) => r.id === roleId);

  const removeEmail = (email: string) => setText(emails.filter((e) => e !== email).join(', '));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (emails.length === 0) return setError('Informe pelo menos um e-mail.');
    if (invalid.length) return setError(`Corrija ou remova: ${invalid.join(', ')}`);
    setSaving(true);
    setError('');
    try {
      setResult(await api.invite({ emails, roleId, queueIds }, me.id));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível enviar os convites.');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <>
        {result.invited.length > 0 && (
          <div className={s.inviteSent}>
            <MailCheck aria-hidden />
            <div>
              <strong>
                {result.invited.length === 1 ? 'Convite enviado para 1 pessoa' : `Convites enviados para ${result.invited.length} pessoas`}
              </strong>
              <span>O link vale por 7 dias. Se não chegar, use “Reenviar convite” na lista.</span>
            </div>
          </div>
        )}
        <ul className={s.inviteResults}>
          {result.invited.map((u) => (
            <li key={u.id}>
              <CheckCircle2 className={s.okIcon} aria-hidden />
              {u.email}
              {/* Só no ambiente de desenvolvimento: sem servidor de e-mail, abre o link que iria no e-mail. */}
              {import.meta.env.DEV && u.invite && (
                <a className={s.devLink} href={inviteLink(u.invite.token)} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden /> abrir e-mail (demonstração)
                </a>
              )}
            </li>
          ))}
          {result.skipped.map((skip) => (
            <li key={skip.email} className={s.skipped}>
              <AlertCircle aria-hidden />
              {skip.email} <span>— {skip.reason}</span>
            </li>
          ))}
        </ul>
        <div className={dialogs.actions}>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <Field label="E-mails" hint="Cole um ou vários, separados por vírgula ou linha.">
        {(id) => (
          <TextArea
            id={id}
            autoFocus
            rows={3}
            placeholder="maria@empresa.com.br, joao@empresa.com.br"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError('');
            }}
          />
        )}
      </Field>
      {emails.length > 0 && (
        <div className={s.emailChips} aria-label="E-mails reconhecidos">
          {emails.map((email) => (
            <span key={email} className={cx(s.emailChip, !EMAIL.test(email) && s.emailChipInvalid)}>
              {email}
              <button type="button" onClick={() => removeEmail(email)} aria-label={`Remover ${email}`}>
                <X />
              </button>
            </span>
          ))}
        </div>
      )}

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
        <Button type="submit" variant="primary" disabled={saving || emails.length === 0}>
          {saving ? 'Enviando…' : emails.length > 1 ? `Enviar ${emails.length} convites` : 'Enviar convite'}
        </Button>
      </div>
    </form>
  );
}
