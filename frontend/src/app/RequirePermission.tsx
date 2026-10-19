import type { ReactNode } from 'react';
import { EmptyState, LoadingState, Page } from '../design-system/components';
import type { Permission } from '../domain/types';
import { useCurrentUser } from './permissions';

// Protege uma tela inteira pela permissão do papel. Quem chega por link direto vê o aviso
// em vez da tela (o back-end recusaria os dados de qualquer forma).
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can, loading } = useCurrentUser();
  if (loading) return <LoadingState />;
  if (!can(permission)) {
    return (
      <Page>
        <EmptyState title="Sem permissão" description="Seu papel não dá acesso a esta área. Fale com o administrador da empresa." />
      </Page>
    );
  }
  return children;
}
