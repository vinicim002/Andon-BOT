import { useState, type FormEvent } from 'react';
import { api } from '../../api';
import { Button } from '../../design-system/components';
import { Field, FormGrid, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import { useToast } from '../../design-system/useToast';
import type { Contact } from '../../domain/types';
import dialogs from './dialogs.module.css';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; contact: Contact };

export function EditContactDialog(props: Props) {
  return (
    <Modal open={props.open} onOpenChange={props.onOpenChange} title="Editar contato" description={`WhatsApp ${props.contact.phone}`} size="lg">
      {props.open && <EditContactForm {...props} />}
    </Modal>
  );
}

const fields = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'E-mail', type: 'email' },
  { key: 'jobTitle', label: 'Cargo' },
  { key: 'organization', label: 'Empresa' },
  { key: 'cpf', label: 'CPF', inputMode: 'numeric' },
  { key: 'cnpj', label: 'CNPJ', inputMode: 'numeric' },
] as const;

type Editable = (typeof fields)[number]['key'];

function EditContactForm({ contact, onOpenChange }: Props) {
  const toast = useToast();
  const [values, setValues] = useState<Record<Editable, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, contact[f.key] ?? ''])) as Record<Editable, string>,
  );
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.name.trim()) return toast({ message: 'O nome não pode ficar em branco.', tone: 'error' });
    setSaving(true);
    // Campo vazio vira "sem valor" (undefined), não string vazia.
    const patch = Object.fromEntries(fields.map((f) => [f.key, values[f.key].trim() || undefined]));
    try {
      await api.updateContact(contact.id, patch);
      toast({ message: 'Contato atualizado.' });
      onOpenChange(false);
    } catch {
      toast({ message: 'Não foi possível salvar o contato.', tone: 'error' });
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <FormGrid>
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            {(id) => (
              <TextInput
                id={id}
                type={'type' in f ? f.type : 'text'}
                inputMode={'inputMode' in f ? f.inputMode : undefined}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            )}
          </Field>
        ))}
      </FormGrid>
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
