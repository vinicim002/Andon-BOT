import { useEffect, useState } from 'react';

type QueryState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'error'; data?: undefined; error: Error }
  | { status: 'success'; data: T; error?: undefined };

type Settled<T> = { key: string } & ({ data: T; error?: undefined } | { data?: undefined; error: Error });

// Carregamento mínimo enquanto não há cache/servidor real. Trocar por TanStack Query quando a
// API existir e surgirem invalidação, refetch e atualização em tempo real.
// `key` identifica a consulta: quando muda (ex.: outra conversa), os dados são buscados de novo.
export function useQuery<T>(fetcher: () => Promise<T>, key = ''): QueryState<T> {
  const [settled, setSettled] = useState<Settled<T>>();

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
  }, [key]);

  // Resultado de uma key anterior conta como carregando, sem precisar zerar estado no efeito.
  if (!settled || settled.key !== key) return { status: 'loading' };
  if (settled.error) return { status: 'error', error: settled.error };
  return { status: 'success', data: settled.data as T };
}
