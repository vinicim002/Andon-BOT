// Definição de workflow: JSON validado com tipos de nó fechados (sem código de cliente).
// O canvas edita esta estrutura; o executor (hoje simulado no console, depois nos workers Java)
// a interpreta. Cada publicação congela uma cópia imutável como nova versão.
import type { Id, IsoDateTime, TicketPriority } from './types';

export const WORKFLOW_SCHEMA_VERSION = 1;

export type ConditionOperator = 'contains' | 'not_contains' | 'equals' | 'starts_with' | 'ends_with' | 'exists';

export type NodeConfig = {
  // Gatilhos
  trigger_conversation_started: { endpointId?: Id };
  trigger_message_received: Record<string, never>;
  trigger_keyword: { keywords: string[] };
  // Lógica
  condition: { field: string; operator: ConditionOperator; value: string };
  menu: { question: string; options: string[] };
  // Ações
  send_message: { text: string };
  transfer_queue: { queueId?: Id; summary: string };
  add_tag: { tagId?: Id };
  open_ticket: { subject: string; priority: TicketPriority };
  internal_note: { text: string };
  // Aponta para uma operação de uma integração cadastrada: o autor do workflow escolhe
  // da lista, não digita URL. Credencial, timeout e retentativa ficam na integração.
  http_request: { integrationId?: Id; operationId?: Id; saveAs: string };
  // Responde com a base de conhecimento. A autonomia e os limites vêm da política do tenant;
  // aqui o fluxo escolhe as fontes, se exige citação e para onde entregar no handoff.
  ai_answer: { sourceIds: Id[]; requireCitation: boolean; handoffQueueId?: Id };
  end: { resolve: boolean };
};

export type NodeType = keyof NodeConfig;

export type WorkflowNode<T extends NodeType = NodeType> = {
  id: Id;
  type: T;
  position: { x: number; y: number };
  config: NodeConfig[T];
};

// sourceHandle identifica a saída: 'next' (única), 'yes'/'no' (condição), 'option-N'/'invalid' (menu).
export type WorkflowEdge = { id: Id; source: Id; sourceHandle: string; target: Id };

export type WorkflowDefinition = {
  schemaVersion: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type WorkflowVersion = {
  id: Id;
  number: number;
  definition: WorkflowDefinition;
  note: string;
  publishedBy: Id;
  publishedAt: IsoDateTime;
};

export type WorkflowStatus = 'active' | 'paused';

export interface Workflow {
  id: Id;
  name: string;
  description: string;
  // Rascunho: o que o canvas edita. Não afeta o atendimento até ser publicado.
  draft: WorkflowDefinition;
  draftUpdatedAt: IsoDateTime;
  draftUpdatedBy: Id;
  versions: WorkflowVersion[];
  // Versão que roda no atendimento (pode ser anterior à última, após uma reversão).
  publishedVersionId?: Id;
  status: WorkflowStatus;
  // Enquanto o workflow conduz a conversa, a IA não responde junto.
  pauseAi: boolean;
  stats: { runs24h: number; failures24h: number };
  createdAt: IsoDateTime;
}

export type WorkflowTemplate = 'blank' | 'triage' | 'order_status';
