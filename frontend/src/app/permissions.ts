import { api } from '../api';
import { useQuery } from '../api/useQuery';
import type { Permission, Role, User } from '../domain/types';
import { useSession } from './useSession';

type CurrentUser = { me?: User; role?: Role; can: (permission: Permission) => boolean; loading: boolean };

// Usuário logado + papel, lidos ao vivo (papel ou status podem mudar durante o uso).
// As permissões só ajustam a interface; quem garante o acesso é o back-end.
export function useCurrentUser(): CurrentUser {
  const { user } = useSession();
  const data = useQuery(() => Promise.all([api.users(), api.roles()]));
  const me = data.data?.[0].find((u) => u.id === user?.id);
  const role = data.data?.[1].find((r) => r.id === me?.roleId);
  return { me, role, can: (permission) => Boolean(role?.permissions.includes(permission)), loading: data.status === 'loading' };
}
