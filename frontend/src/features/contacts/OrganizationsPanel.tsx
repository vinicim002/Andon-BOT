import { useMemo, useState } from 'react';
import { Building2, MoreHorizontal, MoreVertical, Pencil, Search, Trash2, Users } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { api } from '../../api';
import { Button, DataTable, EmptyState, MobileList, MobileListRow } from '../../design-system/components';
import { ConfirmDialog } from '../../design-system/ConfirmDialog';
import { TextInput } from '../../design-system/forms';
import { useToast } from '../../design-system/useToast';
import type { Contact, Id, Organization } from '../../domain/types';
import { formatDate } from '../../lib/format';
import { cx } from '../../lib/cx';
import { useIsMobile } from '../../lib/useIsMobile';
import { OrganizationDialog } from './OrganizationDialog';
import s from './Contacts.module.css';

type Props = {
  organizations: Organization[];
  contacts: Contact[];
  onSeeContacts: (organizationId: Id) => void;
};

export function OrganizationsPanel({ organizations, contacts, onSeeContacts }: Props) {
  const toast = useToast();
  const mobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Organization | null>(null);
  const [removing, setRemoving] = useState<Organization | null>(null);

  // Contagem por empresa, calculada uma vez: a tabela consulta por id.
  const counts = useMemo(() => {
    const map = new Map<Id, number>();
    for (const contact of contacts) {
      if (contact.organization) map.set(contact.organization.id, (map.get(contact.organization.id) ?? 0) + 1);
    }
    return map;
  }, [contacts]);

  const term = search.trim().toLowerCase();
  const visible = organizations.filter(
    (o) =>
      !term ||
      o.name.toLowerCase().includes(term) ||
      Boolean(o.cnpj?.includes(term)) ||
      Boolean(o.domain?.toLowerCase().includes(term)),
  );

  return (
    <>
      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <Search aria-hidden />
          <TextInput
            type="search"
            placeholder="Nome, CNPJ ou domínio"
            aria-label="Buscar organizações"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className={s.count}>
          {visible.length} de {organizations.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={term ? 'Nenhuma organização encontrada' : 'Nenhuma organização ainda'}
          description={term ? 'Ajuste a busca.' : 'Organizações aparecem ao cadastrar contatos de empresas.'}
        />
      ) : mobile ? (
        // Organização não tem tela própria: o toque abre a edição; o resto fica no ⋮.
        <MobileList>
          {visible.map((organization) => {
            const count = counts.get(organization.id) ?? 0;
            return (
              <MobileListRow
                key={organization.id}
                onClick={() => setEditing(organization)}
                leading={
                  <span className={s.orgIconLarge} aria-hidden>
                    <Building2 />
                  </span>
                }
                title={organization.name}
                meta={count === 1 ? '1 contato' : `${count} contatos`}
                subtitle={[organization.cnpj, organization.domain].filter(Boolean).join(' · ') || organization.notes}
                trailing={
                  <RowMenu
                    organization={organization}
                    onRemove={() => setRemoving(organization)}
                    onSeeContacts={count > 0 ? () => onSeeContacts(organization.id) : undefined}
                  />
                }
              />
            );
          })}
        </MobileList>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CNPJ</th>
              <th>Domínio</th>
              <th>Contatos</th>
              <th>Desde</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((organization) => {
              const count = counts.get(organization.id) ?? 0;
              return (
                <tr key={organization.id}>
                  <td>
                    <span className={s.orgCell}>
                      <span className={s.orgIcon} aria-hidden>
                        <Building2 />
                      </span>
                      <span>
                        {organization.name}
                        {organization.notes && <small>{organization.notes}</small>}
                      </span>
                    </span>
                  </td>
                  <td className={s.code}>{organization.cnpj ?? '—'}</td>
                  <td>{organization.domain ?? '—'}</td>
                  <td>
                    {count === 0 ? (
                      <span className={s.muted}>Nenhum</span>
                    ) : (
                      // Atalho para a aba de pessoas já filtrada: a pergunta natural depois de
                      // ver a empresa é "quem são as pessoas dela".
                      <Button variant="ghost" icon={<Users />} onClick={() => onSeeContacts(organization.id)}>
                        {count}
                      </Button>
                    )}
                  </td>
                  <td>{formatDate(organization.createdAt)}</td>
                  <td className={s.rowActions}>
                    <Button
                      variant="ghost"
                      iconOnlyLabel={`Editar ${organization.name}`}
                      icon={<Pencil />}
                      onClick={() => setEditing(organization)}
                    />
                    <RowMenu organization={organization} onRemove={() => setRemoving(organization)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      <OrganizationDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        organization={editing ?? undefined}
        onSaved={(message) => toast({ message })}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remover ${removing?.name ?? ''}?`}
        confirmLabel="Remover organização"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          const organization = removing;
          setRemoving(null);
          try {
            await api.deleteOrganization(organization.id);
            toast({ message: `${organization.name} removida.` });
          } catch (error) {
            toast({ message: error instanceof Error ? error.message : 'Não foi possível remover.', tone: 'error' });
          }
        }}
      >
        <p>
          Organizações com contatos não podem ser removidas — troque a empresa dessas pessoas antes. Esta ação não pode ser desfeita.
        </p>
      </ConfirmDialog>
    </>
  );
}

type RowMenuProps = { organization: Organization; onRemove: () => void; onSeeContacts?: () => void };

// Mesmo menu na tabela e na lista do celular. Lá o "ver contatos" entra no menu, porque não
// há coluna de contagem para servir de atalho.
function RowMenu({ organization, onRemove, onSeeContacts }: RowMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" iconOnlyLabel={`Mais ações para ${organization.name}`} icon={onSeeContacts ? <MoreVertical /> : <MoreHorizontal />} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={s.menu} align="end" sideOffset={4}>
          {onSeeContacts && (
            <DropdownMenu.Item className={s.menuItem} onSelect={onSeeContacts}>
              <Users aria-hidden /> Ver contatos
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item className={cx(s.menuItem, s.menuDanger)} onSelect={onRemove}>
            <Trash2 aria-hidden /> Remover organização
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
