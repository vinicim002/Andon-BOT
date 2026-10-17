# Arquitetura — resumo técnico

Resumo público das decisões do documento interno **Decisões de Arquitetura**. Em caso de
divergência, o documento interno prevalece e este arquivo deve ser atualizado.

## Produto

Plataforma SaaS B2B multiempresa para operação de atendimento, vendas e automação conversacional:
central colaborativa de conversas, contatos, tickets e automações. Começa no WhatsApp oficial
(Cloud API) e se prepara para webchat e voz por meio de adaptadores de canal.

## Stack

| Camada | Escolha |
| --- | --- |
| Back-end | Java 21, Spring Boot, Maven |
| Console (front-end) | React, TypeScript, Vite (SPA) |
| Banco | PostgreSQL (fonte de verdade + outbox) |
| Migrations | Flyway |
| Tempo real | WebSocket; Redis só quando houver mais de uma instância |
| Observabilidade | OpenTelemetry e logs estruturados desde o início |
| Infra (hipótese) | Containers em Google Cloud Run |

## Princípios

- **Monorepo** com fronteiras internas claras.
- **Monólito modular com processos separados**: API, workers, scheduler/conectores e gateway de
  tempo real. Nada de microserviços ou Kubernetes prematuros.
- **Outbox transacional** + workers no PostgreSQL para trabalho crítico.
- **Entidades canônicas**: o núcleo não conhece detalhes do provedor de canal.
- **Endpoint de canal ≠ fila operacional**: um número pode rotear para várias filas e uma fila
  pode atender vários endpoints.
- **Workflow visual** sobre JSON/DSL versionado (rascunho, revisão, publicação, rollback).
- **IA governada**: autonomia configurável por tenant/fluxo, handoff humano, fontes e auditoria.
- **Ticket sempre tem protocolo** obrigatório e imutável (relação inicial 1:1).
- **Entitlements** (plano, limites, consumo) transversais desde o início.
- **WhatsApp em produção só via Cloud API**; Baileys apenas em desenvolvimento/teste interno.

## Estados de conversa

`nova`, `na fila`, `em atendimento`, `aguardando cliente`, `aguardando ação interna`,
`resolvida`, `encerrada`. Transferência é um evento auditável, não um estado.

## Entidades do domínio

- tenant, usuário, papel, equipe, permissão;
- contato, organização, atributos de CRM;
- endpoint de canal, fila operacional, política de roteamento;
- conversa, participante, mensagem, anexo, evento de conversa;
- ticket, protocolo, prioridade, status, eventos;
- workflow, versão, publicação, execução, etapa;
- base de conhecimento, fonte, documento, fragmento;
- integração, credencial, execução, tentativa;
- uso/limite de plano, auditoria, autorização de suporte, política de retenção.

## Segurança

- Isolamento por tenant com defesa em profundidade (aplicação + RLS).
- Credenciais cifradas e fora de logs.
- Acesso de suporte só com autorização do cliente, escopo, prazo e trilha de auditoria.
- MFA recomendado para administradores; SSO é extensão planejada.
