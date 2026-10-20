// Integração HTTP: configurada uma vez pela administração e reaproveitada pelos workflows.
// O nó do workflow escolhe uma operação desta lista — nunca digita URL livre. Isso mantém o
// workflow fechado (sem código de cliente), guarda a credencial num só lugar e dá rastro
// de execução por integração.
import type { Id, IsoDateTime } from './types';

export type HttpMethod = 'GET' | 'POST';

export type IntegrationAuthKind = 'none' | 'bearer' | 'api_key' | 'basic';

export interface IntegrationAuth {
  kind: IntegrationAuthKind;
  // Cabeçalho onde a chave vai, quando `kind` é 'api_key'. Ex.: X-API-Key.
  headerName?: string;
  // Usuário do Basic; a senha é segredo.
  username?: string;
  // Últimos caracteres do segredo cifrado. O valor em si nunca volta do back-end.
  secretHint?: string;
}

// Operação nomeada: o que o autor do workflow vê e escolhe ("Consultar pedido"),
// em vez de método e caminho.
export interface IntegrationOperation {
  id: Id;
  name: string;
  method: HttpMethod;
  // Caminho relativo à baseUrl, podendo usar {{variáveis}} do workflow.
  path: string;
  // Corpo JSON para POST, também com {{variáveis}}.
  body?: string;
}

export type IntegrationStatus = 'active' | 'disabled';

export interface Integration {
  id: Id;
  name: string;
  description: string;
  baseUrl: string;
  auth: IntegrationAuth;
  // Cabeçalhos fixos enviados em toda chamada.
  headers: { name: string; value: string }[];
  operations: IntegrationOperation[];
  timeoutMs: number;
  // Política de retentativa: o worker repete falhas transitórias com espera crescente.
  retry: { attempts: number; backoffSeconds: number };
  status: IntegrationStatus;
  createdAt: IsoDateTime;
}

// O segredo só sobe; desce apenas como `secretHint`.
export interface IntegrationInput {
  name: string;
  description: string;
  baseUrl: string;
  auth: IntegrationAuth & { secret?: string };
  headers: { name: string; value: string }[];
  operations: IntegrationOperation[];
  timeoutMs: number;
  retry: { attempts: number; backoffSeconds: number };
}

export type IntegrationRunStatus = 'success' | 'failed';

// Execução registrada: uma linha por chamada concluída, com a tentativa em que terminou.
// É o que a Fase 1 pede como "integração HTTP simulada, com logs de execução".
export interface IntegrationRun {
  id: Id;
  integrationId: Id;
  operationName: string;
  method: HttpMethod;
  url: string;
  status: IntegrationRunStatus;
  httpStatus?: number;
  durationMs: number;
  // 1 = acertou de primeira. Maior que 1 mostra a política de retentativa em ação.
  attempts: number;
  error?: string;
  // Quem disparou: um workflow em atendimento, ou um teste manual da tela.
  source: { kind: 'workflow' | 'manual'; workflowName?: string };
  at: IsoDateTime;
}
