# Estrutura e convenções

## Monorepo

```
.cloud/      regras e contexto (única pasta de contexto permitida)
frontend/    console operacional — React + TypeScript + Vite
backend/     API e (futuramente) workers — Java 21 + Spring Boot + Maven
docker-compose.yml  serviços do ambiente local (Postgres)
```

Novas pastas de primeiro nível só com decisão do time. Pastas de ferramentas de IA são proibidas
(ver [README.md](README.md)).

## Gerais

- Código (identificadores, nomes de classes, funções, variáveis) em **inglês**.
- Textos de interface, documentação, commits e mensagens ao usuário em **português**.
- Comentários em português, explicando o *porquê*, não o *o quê*.
- Indentação: 2 espaços no front-end e arquivos de configuração; 4 no Java. UTF-8 e LF
  (ver `.editorconfig`).

## Back-end (`backend/`)

- Pacote raiz `br.com.andon`, organizado **por módulo de domínio**, não por camada técnica:
  `tenant`, `identity`, `contact`, `channel`, `conversation`, `queue`, `ticket`, `audit`,
  `entitlement`, além de `shared` para infraestrutura comum.
- Dentro de cada módulo, separar quando crescer: `api` (controllers/DTOs), `application`
  (casos de uso), `domain` (modelo e regras), `infrastructure` (persistência, adaptadores).
- Um módulo não acessa a persistência de outro; a comunicação é pela camada `application` ou por
  eventos.
- Schema evolui **apenas por migrations Flyway** em `src/main/resources/db/migration`
  (`V<n>__descricao.sql`). Nunca editar uma migration já aplicada em ambiente compartilhado.
- Toda tabela de negócio tem `tenant_id`; RLS será habilitada junto com o contexto de tenant.
- Configuração por variável de ambiente (ver `.env.example` na raiz).
- Contratos expostos via OpenAPI; validação de entrada com Bean Validation.

## Front-end (`frontend/`)

- Organização por **feature** (`src/features/<feature>`), com componentes compartilhados em
  `src/components` e o design system em `src/design-system`.
- Tipos do domínio em `src/domain` — espelham o modelo canônico e servem de rascunho dos contratos
  de API.
- Enquanto a API não existe, telas usam dados fictícios de `src/mocks`, sempre acessados por
  funções em `src/api`, para que a troca por chamadas reais não exija mexer nas telas.
- Cores, espaçamentos, raios e sombras **somente via tokens** (`src/design-system/tokens.css`);
  nada de cor solta em componente.
- Acessibilidade: foco visível, navegação por teclado, rótulos em controles e contraste adequado.
