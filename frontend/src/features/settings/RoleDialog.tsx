import { useState, type FormEvent } from 'react';
import { AlertCircle, Check, Lock } from 'lucide-react';
import { api } from '../../api';
import { Button } from '../../design-system/components';
import { Field, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import { permissionGroups } from '../../domain/labels';
import type { Permission, Role, RoleInput } from '../../domain/types';
import { cx } from '../../lib/cx';
import dialogs from '../inbox/dialogs.module.css';
import s from './Settings.module.css';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; role?: Role; onSaved: (message: string) => void };

export function RoleDialog(props: Props) {
  const title = props.role ? (props.role.system ? `Permissões de ${props.role.name}` : `Editar papel ${props.role.name}`) : 'Novo papel';
  return (
    <Modal open={props.open} onOpenChange={props.onOpenChange} title={title} size="lg">
      {props.open && <RoleForm {...props} />}
    </Modal>
  );
}

function RoleForm({ role, onSaved, onOpenChange }: Props) {
  const readOnly = Boolean(role?.system);
  const [input, setInput] = useState<RoleInput>(
    role ? { name: role.name, description: role.description, permissions: role.permissions } : { name: '', description: '', permissions: ['conversations.reply'] },
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (permission: Permission) =>
    setInput((v) => ({
      ...v,
      permissions: v.permissions.includes(permission) ? v.permissions.filter((p) => p !== permission) : [...v.permissions, permission],
    }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (role) await api.updateRole(role.id, input);
      else await api.createRole(input);
      onSaved(role ? 'Papel atualizado.' : `Papel ${input.name.trim()} criado.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      {readOnly ? (
        <p className={s.securityNote}>
          <Lock aria-hidden />
          <span>Papel do sistema: tem todas as permissões e não pode ser alterado nem excluído.</span>
        </p>
      ) : (
        <div className={s.formRow}>
          <Field label="Nome" className={s.grow}>
            {(id) => <TextInput id={id} autoFocus maxLength={40} placeholder="Ex.: Atendente sênior" value={input.name} onChange={(e) => setInput((v) => ({ ...v, name: e.target.value }))} />}
          </Field>
          <Field label="Descrição" className={s.grow}>
            {(id) => (
              <TextInput id={id} maxLength={120} placeholder="Para que serve este papel" value={input.description} onChange={(e) => setInput((v) => ({ ...v, description: e.target.value }))} />
            )}
          </Field>
        </div>
      )}

      <div className={s.permissionMatrix}>
        {permissionGroups.map((group) => (
          <fieldset key={group.title} className={s.permissionGroup}>
            <legend>{group.title}</legend>
            {group.permissions.map((p) => {
              const on = input.permissions.includes(p.key);
              return (
                <label key={p.key} className={cx(s.permissionRow, readOnly && s.permissionReadOnly)}>
                  <input type="checkbox" className="visually-hidden" checked={on} disabled={readOnly} onChange={() => toggle(p.key)} />
                  <span className={s.permissionText}>
                    <strong>{p.label}</strong>
                    <span>{p.description}</span>
                  </span>
                  <span className={cx(s.switch, on && s.switchOn)} aria-hidden>
                    <span>{on && <Check />}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>

      {error && (
        <p className={dialogs.contextLine} role="alert">
          <AlertCircle aria-hidden /> {error}
        </p>
      )}
      <div className={dialogs.actions}>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {readOnly ? 'Fechar' : 'Cancelar'}
        </Button>
        {!readOnly && (
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Salvando…' : role ? 'Salvar' : 'Criar papel'}
          </Button>
        )}
      </div>
    </form>
  );
}
