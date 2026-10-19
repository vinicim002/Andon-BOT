import { useState } from 'react';
import { Eye, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api';
import { Button } from '../../design-system/components';
import { ConfirmDialog } from '../../design-system/ConfirmDialog';
import { useToast } from '../../design-system/useToast';
import { allPermissions } from '../../domain/labels';
import type { Role, User } from '../../domain/types';
import { RoleDialog } from './RoleDialog';
import s from './Settings.module.css';

export function RolesPanel({ roles, users }: { roles: Role[]; users: User[] }) {
  const toast = useToast();
  const [editing, setEditing] = useState<Role | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);

  return (
    <>
      <div className={s.toolbar}>
        <p className={s.muted}>Papéis são conjuntos de permissões. O Administrador é fixo e garante que a empresa nunca fique sem acesso total.</p>
        <Button variant="primary" icon={<Plus />} onClick={() => setEditing('new')}>
          Novo papel
        </Button>
      </div>

      <div className={s.roleGrid}>
        {roles.map((role) => {
          const members = users.filter((u) => u.roleId === role.id && u.status !== 'disabled').length;
          return (
            <article key={role.id} className={s.roleCard}>
              <header className={s.roleHead}>
                <h3>
                  {role.name}
                  {role.system && (
                    <span className={s.pill}>
                      <Lock aria-hidden /> Sistema
                    </span>
                  )}
                </h3>
                <div className={s.queueActions}>
                  {role.system ? (
                    <Button variant="ghost" iconOnlyLabel={`Ver permissões de ${role.name}`} icon={<Eye />} onClick={() => setEditing(role)} />
                  ) : (
                    <>
                      <Button variant="ghost" iconOnlyLabel={`Editar ${role.name}`} icon={<Pencil />} onClick={() => setEditing(role)} />
                      <Button variant="ghost" iconOnlyLabel={`Excluir ${role.name}`} icon={<Trash2 />} onClick={() => setDeleting(role)} />
                    </>
                  )}
                </div>
              </header>
              <p className={s.roleDescription}>{role.description}</p>
              <div className={s.roleMeta}>
                <span>
                  <strong>{members}</strong> {members === 1 ? 'pessoa' : 'pessoas'}
                </span>
                <span>
                  <strong>{role.permissions.length}</strong> de {allPermissions.length} permissões
                </span>
              </div>
              <div className={s.permissionBar} aria-hidden>
                <span style={{ width: `${(role.permissions.length / allPermissions.length) * 100}%` }} />
              </div>
            </article>
          );
        })}
      </div>

      <RoleDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        role={editing === 'new' ? undefined : (editing ?? undefined)}
        onSaved={(message) => {
          setEditing(null);
          toast({ message });
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir o papel ${deleting?.name ?? ''}?`}
        confirmLabel="Excluir papel"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const role = deleting;
          setDeleting(null);
          try {
            await api.deleteRole(role.id);
            toast({ message: 'Papel excluído.' });
          } catch (error) {
            toast({ message: error instanceof Error ? error.message : 'Não foi possível excluir.', tone: 'error' });
          }
        }}
      >
        <p>Só é possível excluir papéis que ninguém usa. Essa ação não pode ser desfeita.</p>
      </ConfirmDialog>
    </>
  );
}
