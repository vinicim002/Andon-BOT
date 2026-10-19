import { useMemo, useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import { Ban, KeyRound, Mail, MoreHorizontal, RotateCcw, Search, UserPlus, XCircle } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { useCurrentUser } from '../../app/permissions';
import { Avatar, Badge, Button, DataTable, EmptyState, ErrorState, LoadingState } from '../../design-system/components';
import { ConfirmDialog } from '../../design-system/ConfirmDialog';
import { Segmented, TextInput } from '../../design-system/forms';
import { useToast } from '../../design-system/useToast';
import { userStatus } from '../../domain/labels';
import type { OperationalQueue, Role, User, UserStatus } from '../../domain/types';
import { cx } from '../../lib/cx';
import { formatAgo, formatRelative } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { EditUserDialog } from './EditUserDialog';
import { InviteDialog } from './InviteDialog';
import { RolesPanel } from './RolesPanel';
import s from './Settings.module.css';

type Filter = 'all' | UserStatus;

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'invited', label: 'Convites' },
  { value: 'disabled', label: 'Desativados' },
];

export function UsersSettings() {
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const data = useQuery(() => Promise.all([api.users(), api.roles(), api.queues()]));

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} />;
  const [users, roles, queues] = data.data;

  return (
    <>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>Usuários e papéis</h2>
          <p className={s.description}>Quem acessa o painel da empresa e o que cada pessoa pode fazer.</p>
        </div>
      </header>
      <div className={s.tabsRow}>
        <Segmented
          label="Seção"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'users', label: `Usuários (${users.filter((u) => u.status !== 'disabled').length})` },
            { value: 'roles', label: `Papéis (${roles.length})` },
          ]}
        />
      </div>
      {tab === 'users' ? <UsersPanel users={users} roles={roles} queues={queues} /> : <RolesPanel roles={roles} users={users} />}
    </>
  );
}

function UsersPanel({ users, roles, queues }: { users: User[]; roles: Role[]; queues: OperationalQueue[] }) {
  const toast = useToast();
  const { me } = useCurrentUser();
  const now = useNow(60_000);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'disable' | 'revoke'; user: User } | null>(null);

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? '—';
  const queuesOf = (u: User) => queues.filter((q) => q.memberIds.includes(u.id));

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((u) => filter === 'all' || u.status === filter)
      .filter((u) => !term || u.name.toLowerCase().includes(term) || u.email.includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, filter, search]);

  const run = async (action: Promise<unknown>, message: string) => {
    try {
      await action;
      toast({ message });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Não foi possível concluir.', tone: 'error' });
    }
  };

  if (!me) return null;

  return (
    <>
      <div className={s.toolbar}>
        <div className={s.chipFilters} role="group" aria-label="Filtrar por status">
          {filters.map((f) => (
            <button key={f.value} type="button" aria-pressed={filter === f.value} className={cx(s.chipFilter, filter === f.value && s.chipFilterActive)} onClick={() => setFilter(f.value)}>
              {f.label}
              <span>{f.value === 'all' ? users.length : users.filter((u) => u.status === f.value).length}</span>
            </button>
          ))}
        </div>
        <div className={s.toolbarRight}>
          <div className={s.searchBox}>
            <Search aria-hidden />
            <TextInput type="search" placeholder="Nome ou e-mail" aria-label="Buscar usuários" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="primary" icon={<UserPlus />} onClick={() => setInviting(true)}>
            Convidar pessoas
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Ninguém encontrado" description="Ajuste o filtro ou a busca." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Papel</th>
              <th>Filas</th>
              <th>Status</th>
              <th>Último acesso</th>
              <th>
                <span className="visually-hidden">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => {
              const expired = u.invite && new Date(u.invite.expiresAt).getTime() < now;
              const daysLeft = u.invite ? Math.max(0, Math.ceil((new Date(u.invite.expiresAt).getTime() - now) / 86_400_000)) : 0;
              return (
                <tr key={u.id} className={u.status === 'disabled' ? s.rowDisabled : undefined}>
                  <td>
                    <span className={s.userCell}>
                      <Avatar name={u.name} size={32} presence={u.status === 'active' ? u.availability : undefined} />
                      <span>
                        <strong>
                          {u.name}
                          {u.id === me.id && <span className={s.youTag}>você</span>}
                        </strong>
                        <span>{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>{roleName(u.roleId)}</td>
                  <td>
                    <span className={s.queueChips}>
                      {queuesOf(u).length === 0 ? (
                        <span className={s.muted}>—</span>
                      ) : (
                        queuesOf(u).map((q) => (
                          <span key={q.id} className={s.queueChip}>
                            <span className={s[`dot-${q.color}`]} aria-hidden />
                            {q.name}
                          </span>
                        ))
                      )}
                    </span>
                  </td>
                  <td>
                    <span className={s.statusCell}>
                      <Badge tone={expired ? 'danger' : userStatus[u.status].tone}>{expired ? 'Convite expirado' : userStatus[u.status].label}</Badge>
                      {u.status === 'invited' && u.invite && (
                        <span className={s.muted}>
                          {expired ? 'reenvie para gerar um link novo' : `enviado ${formatAgo(u.invite.sentAt)} · expira em ${daysLeft} dia(s)`}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={s.muted}>{u.lastSeenAt ? formatRelative(u.lastSeenAt) : 'Nunca acessou'}</td>
                  <td className={s.actionsCell}>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <Button variant="ghost" iconOnlyLabel={`Ações para ${u.name}`} icon={<MoreHorizontal />} />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className={s.menu} align="end" sideOffset={4}>
                          <DropdownMenu.Item className={s.menuItem} disabled={u.status === 'disabled'} onSelect={() => setEditing(u)}>
                            <KeyRound aria-hidden /> Editar papel e filas
                          </DropdownMenu.Item>
                          {u.status === 'invited' && (
                            <>
                              <DropdownMenu.Item className={s.menuItem} onSelect={() => run(api.resendInvite(u.id, me.id), `Convite reenviado para ${u.email}.`)}>
                                <Mail aria-hidden /> Reenviar convite
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className={s.menuSeparator} />
                              <DropdownMenu.Item className={cx(s.menuItem, s.menuDanger)} onSelect={() => setConfirm({ kind: 'revoke', user: u })}>
                                <XCircle aria-hidden /> Revogar convite
                              </DropdownMenu.Item>
                            </>
                          )}
                          {u.status === 'active' && (
                            <>
                              <DropdownMenu.Separator className={s.menuSeparator} />
                              <DropdownMenu.Item className={cx(s.menuItem, s.menuDanger)} disabled={u.id === me.id} onSelect={() => setConfirm({ kind: 'disable', user: u })}>
                                <Ban aria-hidden /> Desativar acesso
                              </DropdownMenu.Item>
                            </>
                          )}
                          {u.status === 'disabled' && (
                            <DropdownMenu.Item className={s.menuItem} onSelect={() => run(api.setUserStatus(u.id, 'active', me.id), `Acesso de ${u.name} reativado.`)}>
                              <RotateCcw aria-hidden /> Reativar acesso
                            </DropdownMenu.Item>
                          )}
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      <InviteDialog open={inviting} onOpenChange={setInviting} roles={roles} queues={queues} me={me} />
      <EditUserDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        user={editing ?? undefined}
        roles={roles}
        queues={queues}
        onSaved={() => {
          setEditing(null);
          toast({ message: 'Acesso atualizado.' });
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.kind === 'revoke' ? `Revogar o convite de ${confirm.user.name}?` : `Desativar o acesso de ${confirm?.user.name ?? ''}?`}
        confirmLabel={confirm?.kind === 'revoke' ? 'Revogar convite' : 'Desativar acesso'}
        destructive
        onConfirm={async () => {
          if (!confirm) return;
          const { kind, user } = confirm;
          setConfirm(null);
          if (kind === 'revoke') return run(api.revokeInvite(user.id), 'Convite revogado. O link deixou de valer.');
          try {
            const returned = await api.setUserStatus(user.id, 'disabled', me.id);
            toast({ message: returned ? `Acesso desativado. ${returned} atendimento(s) voltaram para a fila.` : 'Acesso desativado.' });
          } catch (error) {
            toast({ message: error instanceof Error ? error.message : 'Não foi possível desativar.', tone: 'error' });
          }
        }}
      >
        {confirm?.kind === 'revoke' ? (
          <p>O link do e-mail enviado para {confirm.user.email} deixa de funcionar. Você pode convidar a pessoa de novo depois.</p>
        ) : (
          <p>
            A pessoa perde o acesso imediatamente. Os atendimentos em andamento com ela voltam para a fila e são redistribuídos. O histórico é mantido e
            o acesso pode ser reativado.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
