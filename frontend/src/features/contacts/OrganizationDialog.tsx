import { useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { Button } from '../../design-system/components';
import { Field, FormGrid, TextArea, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import type { Organization, OrganizationInput } from '../../domain/types';
import dialogs from '../inbox/dialogs.module.css';
import s from './Contacts.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Ausente = criação.
  organization?: Organization;
  onSaved?: (message: string) => void;
};

export function OrganizationDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.organization ? `Editar ${props.organization.name}` : 'Nova organização'}
      size="lg"
    >
      {props.open && <OrganizationForm {...props} />}
    </Modal>
  );
}

function OrganizationForm({ organization, onOpenChange, onSaved }: Props) {
  const [input, setInput] = useState<OrganizationInput>({
    name: organization?.name ?? '',
    cnpj: organization?.cnpj ?? '',
    domain: organization?.domain ?? '',
    notes: organization?.notes ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof OrganizationInput>(key: K, value: OrganizationInput[K]) =>
    setInput((v) => ({ ...v, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (organization) {
        await api.saveOrganization(organization.id, input);
        onSaved?.('Organização atualizada.');
      } else {
        const created = await api.createOrganization(input);
        onSaved?.(`${created.name} cadastrada.`);
      }
      onOpenChange(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <FormGrid>
        <Field label="Nome">
          {(id) => <TextInput id={id} autoFocus value={input.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <Field label="CNPJ">
          {(id) => (
            <TextInput
              id={id}
              inputMode="numeric"
              placeholder="00.000.000/0001-00"
              value={input.cnpj}
              onChange={(e) => set('cnpj', e.target.value)}
            />
          )}
        </Field>
      </FormGrid>

      <Field label="Domínio de e-mail" hint="Usado para sugerir a empresa de contatos novos. Ex.: empresa.com.br">
        {(id) => <TextInput id={id} placeholder="empresa.com.br" value={input.domain} onChange={(e) => set('domain', e.target.value)} />}
      </Field>

      <Field label="Observações" hint="Contexto comercial que vale para toda a empresa.">
        {(id) => <TextArea id={id} rows={3} value={input.notes} onChange={(e) => set('notes', e.target.value)} />}
      </Field>

      {organization && (
        <p className={s.helper}>
          Renomear vale para todos os contatos desta organização, inclusive no histórico das conversas.
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
          {saving ? 'Salvando…' : organization ? 'Salvar' : 'Cadastrar organização'}
        </Button>
      </div>
    </form>
  );
}
