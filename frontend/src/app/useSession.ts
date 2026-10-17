import { createContext, useContext } from 'react';
import type { User } from '../domain/types';

export type Session = {
  user?: User;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

export const SessionContext = createContext<Session | undefined>(undefined);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession precisa estar dentro de SessionProvider');
  return session;
}
