# Andon

Plataforma SaaS B2B multiempresa para operação de atendimento, vendas e automação conversacional,
começando pelo WhatsApp oficial.

> Regras, convenções e contexto do projeto: [`.cloud/`](.cloud/README.md). Leia antes de contribuir.

## Estrutura

```
.cloud/      regras e contexto do projeto
frontend/    console operacional (React + TypeScript + Vite)
backend/     API (Java 21 + Spring Boot + Maven)
```

## Pré-requisitos

- Node.js 22+
- JDK 21
- Docker (Postgres local)

## Rodando localmente

```bash
# banco
cp .env.example .env
docker compose up -d postgres

# back-end (http://localhost:8080/actuator/health)
cd backend && ./mvnw spring-boot:run

# front-end (http://localhost:5173)
cd frontend && npm install && npm run dev
```

O front-end funciona sozinho com dados fictícios enquanto a API evolui.
