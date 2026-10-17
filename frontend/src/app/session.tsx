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

  const signIn = async (email: string, password: string) => {
    const signedIn = await api.signIn(email, password);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(signedIn));
    } catch {
      // Sem armazenamento a sessão vale só até recarregar a página.
    }
    setUser(signedIn);
  };

  const signOut = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada a limpar.
    }
    setUser(undefined);
  };

  return <SessionContext.Provider value={{ user, signIn, signOut }}>{children}</SessionContext.Provider>;
}

export function RequireSession({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
