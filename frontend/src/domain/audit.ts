// Trilha de auditoria do tenant: quem mudou o quê, quando, e de que valor para qual.
// Nada aqui é editável — um evento registrado não muda nem desaparece. No banco é a tabela
// `audit_event`, e o ator vem sempre da sessão do back-end, nunca de um campo da requisição.
import type { Id, IsoDateTime } from './types';

export type AuditEntityType =
  | 'channel'
  | 'integration'
  | 'knowledge_source'
  | 'ai_policy'
  | 'queue'
  | 'role'
  | 'user'
  | 'contact'
  | 'organization'
  | 'workflow';

export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'enabled'
  | 'disabled'
  | 'tested'
  | 'reindexed'
  | 'published'
  | 'restored'
  | 'invited';

// Mudança de um campo. Valores guardados como texto legível, não como JSON cru: a trilha
// é lida por pessoas, e segredo nunca entra aqui (só a dica, quando faz sentido).
export interface AuditChange {
  field: string;
  from?: string;
  to?: string;
}

export interface AuditEvent {
  id: Id;
  at: IsoDateTime;
  // Ausente = ação do próprio sistema (indexador, rodízio de fila, worker).
  actorUserId?: Id;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: Id;
  // Nome no momento da ação. É cópia de propósito: a entidade pode ser renomeada ou removida
  // depois, e a trilha tem de continuar legível sem depender do estado atual.
  entityLabel: string;
  summary: string;
  changes: AuditChange[];
}
