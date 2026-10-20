import { api } from '../api';
import { useQuery } from '../api/useQuery';
import type { Permission, Role, User } from '../domain/types';
import { useSession } from './useSession';

// Qualquer permissão de configuração dá acesso à área; a área mostra só as seções do papel.
const settingsPermissions: Permission[] = [
  'settings.queues',
  'settings.quick_replies',
  'settings.users',
  'settings.channels',
  'settings.integrations',
  'settings.knowledge',
  'settings.ai',
  'settings.audit',
];

export const canSeeSettings = (can: (permission: Permission) => boolean) => settingsPermissions.some(can);

type CurrentUser ={ me?: User; role?: Role; can: (permission: Permission) => boolean; loading: boolean };

// Usuário logado + papel, lidos ao vivo (papel ou status podem mudar durante o uso).
// As permissões só ajustam a interface; quem garante o acesso é o back-end.
export function useCurrentUser(): CurrentUser {
  const { user } = useSession();
  const data = useQuery(() => Promise.all([api.users(), api.roles()]));
  const me = data.data?.[0].find((u) => u.id === user?.id);
  const role = data.data?.[1].find((r) => r.id === me?.roleId);
  return { me, role, can: (permission) => Boolean(role?.permissions.includes(permission)), loading: data.status === 'loading' };
}
