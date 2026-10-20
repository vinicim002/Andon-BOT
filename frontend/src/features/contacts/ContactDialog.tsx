import { useState, type FormEvent } from 'react';
import { AlertCircle, Building2, Plus } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Button } from '../../design-system/components';
import { Field, FormGrid, Select, TextArea, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import type { Contact, ContactInput } from '../../domain/types';
import dialogs from '../inbox/dialogs.module.css';
import s from './Contacts.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Ausente = criação.
  contact?: Contact;
  onSaved?: (contact: Contact, message: string) => void;
};

export function ContactDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.contact ? 'Editar contato' : 'Novo contato'}
      description={props.contact ? `WhatsApp ${props.contact.phone}` : undefined}
      size="lg"
    >
      {props.open && <ContactForm {...props} />}
    </Modal>
  );
}

function ContactForm({ contact, onOpenChange, onSaved }: Props) {
  const organizations = useQuery(api.organizations);
  const [input, setInput] = useState<ContactInput>({
    name: contact?.name ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    jobTitle: contact?.jobTitle ?? '',
    organizationId: contact?.organization?.id,
    cpf: contact?.cpf ?? '',
    cnpj: contact?.cnpj ?? '',
    notes: contact?.notes ?? '',
  });
  // Empresa nova digitada no próprio formulário, para não interromper o cadastro do contato.
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ContactInput>(key: K, value: ContactInput[K]) => setInput((v) => ({ ...v, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = contact ? await api.saveContact(contact.id, input) : await api.createContact(input);
      onSaved?.(saved, contact ? 'Contato atualizado.' : `${saved.name} cadastrado com o código ${saved.code}.`);
      onOpenChange(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar o contato.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <FormGrid>
        <Field label="Nome">
          {(id) => <TextInput id={id} autoFocus value={input.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <Field label="Telefone" hint="Com DDI e DDD.">
          {(id) => (
            <TextInput
              id={id}
              inputMode="tel"
              placeholder="+55 11 90000-0000"
              value={input.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          )}
        </Field>
        <Field label="E-mail">
          {(id) => <TextInput id={id} type="email" value={input.email} onChange={(e) => set('email', e.target.value)} />}
        </Field>
        <Field label="Cargo">
          {(id) => <TextInput id={id} value={input.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />}
        </Field>
        <Field label="CPF">
          {(id) => <TextInput id={id} inputMode="numeric" value={input.cpf} onChange={(e) => set('cpf', e.target.value)} />}
        </Field>
        <Field label="CNPJ">
          {(id) => <TextInput id={id} inputMode="numeric" value={input.cnpj} onChange={(e) => set('cnpj', e.target.value)} />}
        </Field>
      </FormGrid>

      {creatingOrg ? (
        <Field label="Nova organização" hint="Fica disponível para os outros contatos depois de salvar.">
          {(id) => (
            <div className={s.inlineRow}>
              <TextInput
                id={id}
                autoFocus
                placeholder="Nome da empresa"
                value={input.newOrganizationName ?? ''}
                onChange={(e) => set('newOrganizationName', e.target.value)}
              />
              <Button
                variant="ghost"
                onClick={() => {
                  setCreatingOrg(false);
                  set('newOrganizationName', undefined);
                }}
              >
                Cancelar
              </Button>
            </div>
          )}
        </Field>
      ) : (
        <Field label="Organização">
          {(id) => (
            <div className={s.inlineRow}>
              <Select
                id={id}
                value={input.organizationId ?? ''}
                onChange={(e) => set('organizationId', e.target.value || undefined)}
              >
                <option value="">Sem organização</option>
                {organizations.data?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
              <Button variant="secondary" icon={<Plus />} onClick={() => setCreatingOrg(true)}>
                Nova
              </Button>
            </div>
          )}
        </Field>
      )}

      <Field label="Observações" hint="Contexto que ajuda quem atender depois.">
        {(id) => <TextArea id={id} rows={3} value={input.notes} onChange={(e) => set('notes', e.target.value)} />}
      </Field>

      {!contact && (
        <p className={s.helper}>
          <Building2 aria-hidden /> O código do contato é gerado automaticamente ao salvar.
        </p>
      )}

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
          {saving ? 'Salvando…' : contact ? 'Salvar' : 'Cadastrar contato'}
        </Button>
      </div>
    </form>
  );
}
