# Estratégia de desenvolvimento

## Front-end primeiro, back-end junto

O front-end é estruturado desde o início e serve de **ferramenta de definição do produto**:
telas e fluxos funcionais revelam campos, estados, permissões e contratos de API antes que as
decisões fiquem rígidas no banco.

O back-end, neste primeiro momento, tem **apenas a base e a modelagem essencial**:

- aplicação Spring Boot configurada, com health check;
- migration inicial com o núcleo canônico (tenant, usuário, contato, endpoint de canal, fila,
  conversa, mensagem, ticket/protocolo, auditoria);
- sem implementar regras, endpoints ou integrações antes de a interface mostrar a necessidade.

## Ciclo de evolução

1. Desenhar/ajustar a tela com dados fictícios (`frontend/src/mocks`).
2. Consolidar os tipos em `frontend/src/domain` — eles viram o rascunho do contrato.
3. Validar o fluxo com o time.
4. Implementar no back-end: migration → domínio → caso de uso → endpoint.
5. Trocar o mock pela chamada real em `frontend/src/api`.

## Prioridade da Fase 0

- monorepo, convenções e ambiente local;
- design system (tokens e componentes fundamentais);
- shell do console e telas de inbox, contatos e tickets com dados fictícios;
- modelo canônico no banco.
