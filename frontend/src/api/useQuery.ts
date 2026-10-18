import { useEffect, useState } from 'react';
import { onChange } from './events';

type QueryState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'error'; data?: undefined; error: Error }
  | { status: 'success'; data: T; error?: undefined };

type Settled<T> = { key: string } & ({ data: T; error?: undefined } | { data?: undefined; error: Error });

// Carregamento mínimo enquanto não há cache/servidor real. Trocar por TanStack Query quando a
// API existir. `key` identifica a consulta: quando muda (ex.: outra conversa), busca de novo.
// Quando os dados mudam (notifyChange), recarrega em segundo plano mantendo o que já está na tela.
export function useQuery<T>(fetcher: () => Promise<T>, key = ''): QueryState<T> {
  const [settled, setSettled] = useState<Settled<T>>();
  const [revision, setRevision] = useState(0);

  useEffect(() => onChange(() => setRevision((r) => r + 1)), []);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => active && setSettled({ key, data }))
      .catch((error: Error) => active && setSettled({ key, error }));
    return () => {
      active = false;
    };
    // O fetcher costuma ser uma função inline; a identidade da consulta é a key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, revision]);

  // Resultado de uma key anterior conta como carregando, sem precisar zerar estado no efeito.
  if (!settled || settled.key !== key) return { status: 'loading' };
  if (settled.error) return { status: 'error', error: settled.error };
  return { status: 'success', data: settled.data as T };
}
