# Paridade com o bot antigo

Acompanhamento das capacidades do `handle-bot-antigo/` e da decisão para cada uma no novo produto.
Atualize ao identificar novidades no sistema antigo.

Status: `avaliar` · `reimplementar` · `redesenhar` · `não migrar` · `entregue`

| Capacidade (bot antigo) | Status | Observação |
| --- | --- | --- |
| Multiempresa e RBAC | redesenhar | Tenant, papel e permissão canônicos; RLS revalidada |
| Login e usuários | reimplementar | |
| Inbox compartilhado (responsável, notas, transferência, pausa de bot) | reimplementar | Base da Fase 1; tempo real via WebSocket |
| Roteamento / distribuição de atendimentos | redesenhar | Fila operacional separada de endpoint de canal |
| Contatos e importação de agenda | avaliar | |
| Configuração de atendimento (setores, horários) | avaliar | |
| Sessões de WhatsApp | redesenhar | Produção via Cloud API; Baileys só em dev |
| Envio imediato e agendamentos | avaliar | |
| Grupos | avaliar | |
| Automações e execuções | redesenhar | Workflow visual versionado |
| Agente de IA | redesenhar | IA governada, RAG com citações e handoff |
| Fila durável, retries, locks | redesenhar | Outbox no PostgreSQL + workers Java |
| Backup | avaliar | |
| Observabilidade | redesenhar | OpenTelemetry e logs estruturados |
| Modo suporte | redesenhar | Autorização do cliente, escopo, prazo e auditoria |
