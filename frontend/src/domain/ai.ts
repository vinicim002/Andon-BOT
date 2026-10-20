// IA governada: o que a IA pode responder, com base em quais fontes, e quando ela precisa
// entregar para uma pessoa. O documento trata autonomia como configurável por tenant e por
// fluxo — por isso a política vive aqui (tenant) e o nó do workflow afina por fluxo.
import type { Id, IsoDateTime } from './types';

export type SourceKind = 'url' | 'pdf' | 'text';

// 'indexing' existe porque indexar é assíncrono: a fonte entra na lista antes de poder ser citada.
export type SourceStatus = 'indexed' | 'indexing' | 'error';

export interface KnowledgeSource {
  id: Id;
  name: string;
  kind: SourceKind;
  // Endereço da página ou nome do arquivo. Texto colado não tem origem.
  origin?: string;
  // Conteúdo colado (kind 'text'); nas outras fontes o texto vem da indexação.
  content?: string;
  status: SourceStatus;
  // Fragmentos indexados: é o que a busca recupera e o que a citação aponta.
  chunks: number;
  lastIndexedAt?: IsoDateTime;
  error?: string;
  createdAt: IsoDateTime;
}

export interface SourceInput {
  name: string;
  kind: SourceKind;
  origin?: string;
  content?: string;
}

// Autonomia crescente. 'off' mantém a IA calada; 'act' deixa executar ações autorizadas.
export type AiAutonomy = 'off' | 'suggest' | 'reply' | 'act';

export interface AiPolicy {
  autonomy: AiAutonomy;
  // Fontes que a IA pode citar. Lista vazia = todas as indexadas.
  sourceIds: Id[];
  // Sem fonte que sustente a resposta, a IA não inventa: entrega para uma pessoa.
  requireCitation: boolean;
  // Depois de N respostas sem resolver, entrega para uma pessoa.
  maxRepliesBeforeHandoff: number;
  handoffQueueId?: Id;
  // Assuntos que vão direto para humano, sem a IA tentar.
  blockedTopics: string[];
}

export interface AiCitation {
  sourceId: Id;
  sourceName: string;
  snippet: string;
}

// Resposta avaliada: texto, de onde veio, e o motivo de handoff quando houver.
// Tokens e latência entram desde já porque o documento pede medir uso e custo de IA
// por tenant e por fluxo desde o início.
export interface AiAnswer {
  question: string;
  text: string;
  citations: AiCitation[];
  handoffReason?: string;
  tokens: number;
  latencyMs: number;
  at: IsoDateTime;
}
