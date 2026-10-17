import { useEffect, useState } from 'react';

// Relógio compartilhado para contagens regressivas (janela de 24h, SLA, resolução automática).
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
