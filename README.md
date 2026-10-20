# Andon BOT

Console SaaS B2B para centralizar atendimento, vendas e automação conversacional. O Andon BOT começa pela operação no WhatsApp oficial e oferece à equipe uma única visão de conversas, contatos, tickets, filas e workflows.

**Aplicação online:** [andon-demo.vercel.app](https://andon-demo.vercel.app)

## Propriedade e equipe

Este projeto é de propriedade de [Lucas Dias](https://github.com/LucasDias777).

O desenvolvimento é realizado em parceria com os colaboradores/sócios:

- [Vinicius](https://github.com/vinicim002)
- [Felipy Aguiar](https://github.com/Felipy116)

## O que o produto resolve

Equipes que atendem clientes por canais de mensagem normalmente alternam entre conversas, planilhas, anotações e sistemas internos. O Andon BOT organiza essa operação em um único console, dando contexto e rastreabilidade a cada atendimento.

Principais capacidades atuais:

- Inbox para atendimento em conversas, com filas, responsáveis, filtros, tags e respostas rápidas.
- Gestão de contatos e organizações.
- Tickets com protocolo imutável, prioridade, responsável, histórico e comentários internos.
- Workflows visuais para automatizar triagem, mensagens, decisões e transferências.
- Gestão de usuários, papéis e permissões.
- Configurações de canais, integrações, IA, base de conhecimento e auditoria.
- Interface responsiva, incluindo fluxos mobile para operação no celular.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Front-end | React 19, TypeScript, Vite, React Router, Radix UI e Lucide |
| Editor de fluxos | React Flow (`@xyflow/react`) |
| Back-end | Java 21, Spring Boot, Maven, Spring MVC e Validation |
| Dados | PostgreSQL, JPA/Hibernate e Flyway |
| Ambiente local | Docker Compose |
| Deploy do front-end | Vercel |

## Estrutura do repositório

```text
frontend/     Console operacional em React + TypeScript
backend/      API em Java + Spring Boot
doc/          Materiais internos do projeto (não versionados)
vercel.json   Configuração de build e SPA para a Vercel
```

## Executando localmente

### Pré-requisitos

- Node.js 22 ou superior
- JDK 21
- Docker e Docker Compose

### 1. Banco de dados

```bash
cp .env.example .env
docker compose up -d postgres
```

### 2. API

```bash
cd backend
./mvnw spring-boot:run
```

O health check fica disponível em `http://localhost:8080/actuator/health`.

### 3. Front-end

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`.

> O front-end possui dados fictícios para demonstração enquanto a integração com a API está em evolução. Assim, ele pode ser explorado mesmo sem iniciar o back-end.

## Comandos úteis

```bash
cd frontend
npm run dev        # desenvolvimento
npm run typecheck  # validação TypeScript
npm run lint       # análise estática
npm run build      # build de produção
npm run preview    # serve o build localmente
```

## Deploy

O front-end é publicado na Vercel a partir da raiz deste monorepo. A configuração em [`vercel.json`](./vercel.json) instala as dependências em `frontend/`, executa o build do Vite e redireciona as rotas da SPA para `index.html`.

```bash
vercel deploy --prod
```

As pastas `.vercel/` e `.claude/` são locais e permanecem fora do versionamento.

## Contribuição

Antes de abrir um pull request, execute `npm run typecheck`, `npm run lint` e `npm run build` dentro de `frontend/`. Mantenha mudanças focadas, documente decisões relevantes e não envie arquivos de ambiente, credenciais ou configurações locais.
