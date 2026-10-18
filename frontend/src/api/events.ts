// Aviso de "dados mudaram" para as consultas abertas recarregarem. Com a API real, o mesmo papel
// será da invalidação de cache após mutações e dos eventos recebidos por WebSocket.
type Listener = () => void;

const listeners = new Set<Listener>();

export function onChange(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyChange() {
  for (const listener of listeners) listener();
}
