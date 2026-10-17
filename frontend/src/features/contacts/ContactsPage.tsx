import { UserPlus } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../../design-system/components';
import type { Tone } from '../../domain/labels';
import { formatDate } from '../../lib/format';
import s from '../features.module.css';

export function ContactsPage() {
  const contacts = useQuery(api.contacts);

  return (
    <>
      <PageHeader
        title="Contatos"
        description="Pessoas e organizações que conversam com a empresa."
        actions={<Button variant="primary" icon={<UserPlus />}>Novo contato</Button>}
      />
      {contacts.status === 'loading' && <LoadingState />}
      {contacts.status === 'error' && <ErrorState error={contacts.error} />}
      {contacts.status === 'success' &&
        (contacts.data.length === 0 ? (
          <EmptyState title="Nenhum contato ainda" description="Contatos surgem automaticamente nas conversas." />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Organização</th>
                <th>Etiquetas</th>
                <th>Desde</th>
              </tr>
            </thead>
            <tbody>
              {contacts.data.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <span className={s.nameCell}>
                      <Avatar name={contact.name} size={26} />
                      {contact.name}
                    </span>
                  </td>
                  <td>{contact.phone}</td>
                  <td>{contact.organization ?? '—'}</td>
                  <td>
                    <span className={s.tags}>
                      {contact.tags.map((tag) => (
                        <Badge key={tag.id} tone={tag.color as Tone}>{tag.name}</Badge>
                      ))}
                    </span>
                  </td>
                  <td>{formatDate(contact.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ))}
    </>
  );
}
