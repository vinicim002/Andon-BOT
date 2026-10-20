import { useSyncExternalStore } from 'react';

// Mesmo corte do CSS (max-width: 760px): abaixo dele o console vira app de celular — abas
// embaixo e uma tela por vez. Em JS só para o que o CSS não resolve sozinho, como não abrir
// uma conversa por padrão (no celular ela cobriria a lista inteira).
const QUERY = '(max-width: 760px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
