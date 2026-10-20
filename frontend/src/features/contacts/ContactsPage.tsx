import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Building2, Search, UserPlus, X } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import {
  Avatar,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  MobileList,
  MobileListRow,
  Page,
  PageHeader,
  TagChip,
} from '../../design-system/components';
import { Segmented, Select, TextInput } from '../../design-system/forms';
import { useToast } from '../../design-system/useToast';
import type { Contact, Id, Organization, Tag } from '../../domain/types';
import { formatDate } from '../../lib/format';
import { cx } from '../../lib/cx';
import { useIsMobile } from '../../lib/useIsMobile';
import { ContactDialog } from './ContactDialog';
import { OrganizationDialog } from './OrganizationDialog';
import { OrganizationsPanel } from './OrganizationsPanel';
import s from './Contacts.module.css';
import features from '../features.module.css';

type Tab = 'people' | 'organizations';

export function ContactsPage() {
  const toast = useToast();
  const data = useQuery(() => Promise.all([api.contacts(), api.organizations(), api.tags()]));
  const [tab, setTab] = useState<Tab>('people');
  // O filtro por organização fica aqui porque a aba de organizações também o define,
  // ao mandar a pessoa ver os contatos de uma empresa.
  const [organizationId, setOrganizationId] = useState('');
  const [creating, setCreating] = useState<'contact' | 'organization' | null>(null);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} />;
  const [contacts, organizations, tags] = data.data;

  const seeContactsOf = (id: Id) => {
    setOrganizationId(id);
    setTab('people');
  };

  return (
    <Page>
      <PageHeader
        title="Contatos"
        description="Pessoas e organizações que conversam com a empresa."
        actions={
          tab === 'people' ? (
            <Button variant="primary" icon={<UserPlus />} onClick={() => setCreating('contact')}>
              Novo contato
            </Button>
          ) : (
            <Button variant="primary" icon={<Building2 />} onClick={() => setCreating('organization')}>
              Nova organização
            </Button>
          )
        }
      />

      <div className={s.tabsRow}>
        <Segmented<Tab>
          label="Seção"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'people', label: `Pessoas (${contacts.length})` },
            { value: 'organizations', label: `Organizações (${organizations.length})` },
          ]}
        />
      </div>

      {tab === 'people' ? (
        <PeoplePanel
          contacts={contacts}
          organizations={organizations}
          tags={tags}
          organizationId={organizationId}
          onOrganizationChange={setOrganizationId}
        />
      ) : (
        <OrganizationsPanel organizations={organizations} contacts={contacts} onSeeContacts={seeContactsOf} />
      )}

      <ContactDialog
        open={creating === 'contact'}
        onOpenChange={(open) => !open && setCreating(null)}
        onSaved={(_, message) => toast({ message })}
      />
      <OrganizationDialog
        open={creating === 'organization'}
        onOpenChange={(open) => !open && setCreating(null)}
        onSaved={(message) => toast({ message })}
      />
    </Page>
  );
}

const digits = (value: string) => value.replace(/\D/g, '');

// Busca por nome, telefone, código, e-mail e empresa: o atendente pode ter qualquer um deles
// em mãos quando o cliente procura a empresa.
function matches(contact: Contact, text: string) {
  const term = text.trim().toLowerCase();
  if (!term) return true;
  const onlyDigits = digits(term);
  return (
    contact.name.toLowerCase().includes(term) ||
    contact.code.includes(term) ||
    Boolean(contact.email?.toLowerCase().includes(term)) ||
    Boolean(contact.organization?.name.toLowerCase().includes(term)) ||
    (onlyDigits.length >= 3 && digits(contact.phone).includes(onlyDigits))
  );
}

type PeopleProps = {
  contacts: Contact[];
  organizations: Organization[];
  tags: Tag[];
  organizationId: string;
  onOrganizationChange: (id: string) => void;
};

function PeoplePanel({ contacts, organizations, tags, organizationId, onOrganizationChange }: PeopleProps) {
  const [search, setSearch] = useState('');
  const [tagId, setTagId] = useState('');
  const mobile = useIsMobile();

  const visible = useMemo(
    () =>
      contacts.filter(
        (c) =>
          matches(c, search) &&
          (!organizationId || c.organization?.id === organizationId) &&
          (!tagId || c.tags.some((t) => t.id === tagId)),
      ),
    [contacts, search, organizationId, tagId],
  );

  const filtering = Boolean(search || organizationId || tagId);
  const clear = () => {
    setSearch('');
    onOrganizationChange('');
    setTagId('');
  };

  return (
    <>
      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <Search aria-hidden />
          <TextInput
            type="search"
            placeholder="Nome, telefone, código, e-mail ou empresa"
            aria-label="Buscar contatos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select aria-label="Filtrar por organização" value={organizationId} onChange={(e) => onOrganizationChange(e.target.value)}>
          <option value="">Todas as organizações</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrar por etiqueta" value={tagId} onChange={(e) => setTagId(e.target.value)}>
          <option value="">Todas as etiquetas</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        {filtering && (
          <Button variant="ghost" icon={<X />} onClick={clear}>
            Limpar
          </Button>
        )}
        <span className={s.count}>
          {visible.length} de {contacts.length}
        </span>
      </div>

      {visible.length === 0 ? (
        filtering ? (
          <EmptyState title="Nenhum contato encontrado" description="Ajuste a busca ou os filtros." />
        ) : (
          <EmptyState title="Nenhum contato ainda" description="Contatos surgem automaticamente nas conversas." />
        )
      ) : mobile ? (
        <MobileList>
          {visible.map((contact) => (
            <MobileListRow
              key={contact.id}
              to={`/contatos/${contact.id}`}
              leading={<Avatar name={contact.name} size={46} />}
              title={contact.name}
              meta={contact.code}
              subtitle={[contact.organization?.name, contact.phone].filter(Boolean).join(' · ')}
              footer={
                contact.tags.length > 0 &&
                contact.tags.map((tag) => (
                  <TagChip key={tag.id} color={tag.color}>
                    {tag.name}
                  </TagChip>
                ))
              }
            />
          ))}
        </MobileList>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Código</th>
              <th>Telefone</th>
              <th>Organização</th>
              <th>Etiquetas</th>
              <th>Desde</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((contact) => (
              <tr key={contact.id}>
                <td>
                  {/* A linha inteira não é clicável: o link dá alvo de foco e atalho de teclado. */}
                  <Link className={cx(features.nameCell, s.contactLink)} to={`/contatos/${contact.id}`}>
                    <Avatar name={contact.name} size={26} />
                    <span>
                      {contact.name}
                      {contact.jobTitle && <small>{contact.jobTitle}</small>}
                    </span>
                  </Link>
                </td>
                <td className={s.code}>{contact.code}</td>
                <td className={s.code}>{contact.phone}</td>
                <td>{contact.organization?.name ?? '—'}</td>
                <td>
                  <span className={features.tags}>
                    {contact.tags.map((tag) => (
                      <TagChip key={tag.id} color={tag.color}>
                        {tag.name}
                      </TagChip>
                    ))}
                  </span>
                </td>
                <td>{formatDate(contact.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
