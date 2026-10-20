import { api } from '../../api';
import { useToast } from '../../design-system/useToast';
import { availability as availabilityLabels } from '../../domain/labels';
import type { Availability, User } from '../../domain/types';

// Troca de status do atendente, com o aviso de quantos atendimentos chegaram pelo rodízio.
// Usada pelo menu da conta (desktop) e pela tela "Mais" (celular).
export function useChangeAvailability(me: User) {
  const toast = useToast();
  return async (next: Availability, reason?: string) => {
    try {
      const received = await api.setAvailability(me.id, next, reason);
      const label = next === 'paused' ? `Em pausa${reason ? ` — ${reason}` : ''}` : availabilityLabels[next].label;
      toast({ message: received ? `${label}. Você recebeu ${received} atendimento(s) da fila.` : `Status: ${label}.` });
    } catch {
      toast({ message: 'Não foi possível mudar o status.', tone: 'error' });
    }
  };
}
