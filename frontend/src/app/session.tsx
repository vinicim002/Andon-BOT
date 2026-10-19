import { useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { api } from '../api';
import type { User } from '../domain/types';
import { SessionContext, useSession } from './useSession';

const STORAGE_KEY = 'andon-session';

// Sessão de demonstração guardada no sessionStorage. Com a API real, vira cookie HttpOnly
// emitido pelo back-end — nenhum token deve ficar acessível ao JavaScript.
function readStored(): User | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : undefined;
  } catch {
    return undefined;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | undefined>(readStored);
  // Saída explícita ("Sair"): o próximo login começa do início, sem voltar à página de quem saiu.
  const [signedOut, setSignedOut] = useState(false);

  const signIn = async (email: string, password: string) => {
    const signedIn = await api.signIn(email, password);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(signedIn));
    } catch {
      // Sem armazenamento a sessão vale só até recarregar a página.
    }
    setSignedOut(false);
    setUser(signedIn);
  };

  const signOut = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada a limpar.
    }
    setSignedOut(true);
    setUser(undefined);
  };

  return <SessionContext.Provider value={{ user, signedOut, signIn, signOut }}>{children}</SessionContext.Provider>;
}

export function RequireSession({ children }: { children: ReactNode }) {
  const { user, signedOut } = useSession();
  const location = useLocation();
  // Sessão ausente por link direto (ou expirada): depois do login, volta para onde a pessoa ia.
  if (!user) return <Navigate to="/login" replace state={signedOut ? null : { from: location.pathname + location.search }} />;
  return children;
}
