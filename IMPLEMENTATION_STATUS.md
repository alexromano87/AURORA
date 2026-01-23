# 🚀 AURORA - Implementation Status

Ultimo aggiornamento: 02/01/2026

## ✅ Completato (Sprint 0 - Bootstrap)

### Struttura Monorepo
- [x] package.json root con workspaces
- [x] turbo.json configurato
- [x] .gitignore completo
- [x] .prettierrc
- [x] README.md

### Database Layer (packages/db)
- [x] Schema Prisma completo con tutti i modelli
- [x] Seed script con dati iniziali (3 ETF top, IPS policy, portfolio paper)
- [x] package.json con script db:migrate, db:seed, db:studio
- [x] index.ts con PrismaClient singleton
- [x] tsconfig.json

### Shared Packages
- [x] packages/types - TypeScript types condivisi
- [x] packages/contracts - Zod schemas per validation

### Infrastructure
- [x] Docker Compose con 5 servizi (db, redis, api, engine, ui)
- [x] Script init SQL per TimescaleDB
- [x] Health checks per db e redis
- [x] .env.example

### Documentazione
- [x] AURORA_Project_Codex_v2.md (57KB)
- [x] AURORA_Project_Codex_v2.pdf (1.2MB, documentazione completa)
- [x] README.md con quick start

---

## 🔨 Da Implementare

### API (NestJS) - apps/api
**Files necessari:**

```
apps/api/
├── package.json
├── tsconfig.json
├── nest-cli.json
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── health/
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   ├── ips/
│   │   ├── ips.controller.ts
│   │   ├── ips.service.ts
│   │   └── ips.module.ts
│   ├── portfolio/
│   │   ├── portfolio.controller.ts
│   │   ├── portfolio.service.ts
│   │   └── portfolio.module.ts
│   ├── transactions/
│   │   ├── transactions.controller.ts
│   │   ├── transactions.service.ts
│   │   └── transactions.module.ts
│   ├── engine/
│   │   ├── engine.controller.ts
│   │   ├── engine.service.ts
│   │   ├── engine.module.ts
│   │   └── queue.service.ts (BullMQ)
│   ├── alerts/
│   │   ├── alerts.controller.ts
│   │   ├── alerts.service.ts
│   │   └── alerts.module.ts
│   └── instruments/
│       ├── instruments.controller.ts
│       ├── instruments.service.ts
│       └── instruments.module.ts
└── test/
```

**Dipendenze principali:**
```json
{
  "@nestjs/core": "^10.3.0",
  "@nestjs/common": "^10.3.0",
  "@nestjs/platform-express": "^10.3.0",
  "@nestjs/swagger": "^7.2.0",
  "@nestjs/bullmq": "^10.0.0",
  "bullmq": "^5.0.0",
  "@aurora/db": "workspace:*",
  "@aurora/types": "workspace:*",
  "@aurora/contracts": "workspace:*"
}
```

**Endpoints da implementare:**

| Endpoint | Method | Descrizione |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/ips` | POST | Create IPS |
| `/api/ips/:id/versions` | POST | Create IPS version |
| `/api/ips/:id/activate/:versionId` | POST | Activate version |
| `/api/portfolios` | GET, POST | List/Create portfolios |
| `/api/portfolios/:id` | GET | Get portfolio detail |
| `/api/portfolios/:id/transactions` | POST | Add transaction |
| `/api/portfolios/:id/snapshots` | GET | Get snapshots |
| `/api/engine/run` | POST | Enqueue engine job |
| `/api/engine/runs/:runId` | GET | Get run status |
| `/api/proposals/:portfolioId/latest` | GET | Get latest proposal |
| `/api/proposals/:id/execute` | POST | Execute proposal |
| `/api/instruments` | GET, POST | List/Add instruments |
| `/api/alerts` | GET | List alerts |
| `/api/alerts/:id/acknowledge` | POST | Acknowledge alert |

---

### Engine (Python) - services/engine

**Files necessari:**

```
services/engine/
├── requirements.txt
├── pyproject.toml (opzionale)
├── src/
│   ├── __init__.py
│   ├── main.py (FastAPI health endpoint)
│   ├── worker.py (BullMQ consumer)
│   ├── config.py
│   ├── database.py (SQLAlchemy)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── etf.py
│   │   └── position.py
│   ├── data/
│   │   ├── __init__.py
│   │   ├── providers/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── yahoo.py
│   │   │   └── composite.py
│   │   └── isin_mapper.py
│   ├── scoring/
│   │   ├── __init__.py
│   │   ├── etf_scorer.py
│   │   └── filters.py
│   ├── pac/
│   │   ├── __init__.py
│   │   ├── engine.py
│   │   └── constraints.py
│   └── jobs/
│       ├── __init__.py
│       ├── etf_scoring_job.py
│       ├── monthly_pac_job.py
│       └── base_job.py
└── tests/
```

**Dipendenze (requirements.txt):**
```
fastapi==0.110.0
uvicorn==0.27.0
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
pandas==2.2.0
numpy==1.26.3
yfinance==0.2.36
pydantic==2.6.0
pydantic-settings==2.1.0
redis==5.0.1
bullmq-python==0.1.0  # o simile
requests==2.31.0
beautifulsoup4==4.12.3
pytest==8.0.0
```

**Jobs da implementare:**

1. **ETF_SCORING**: filtra + score ETF per bucket
2. **MONTHLY_PAC**: calcola drift + genera trade list
3. **FETCH_PRICES**: aggiorna prezzi giornalieri (cron)
4. **FETCH_FUNDAMENTALS**: aggiorna metriche ETF (weekly)

---

### UI (Next.js) - apps/ui

**Files necessari:**

```
apps/ui/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── app/
│   ├── layout.tsx
│   ├── page.tsx (dashboard home)
│   ├── portfolios/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── ips/
│   │   ├── page.tsx
│   │   └── wizard/
│   │       └── page.tsx
│   ├── transactions/
│   │   └── page.tsx
│   ├── proposals/
│   │   └── page.tsx
│   └── scoring/
│       └── page.tsx
├── components/
│   ├── ui/ (shadcn/ui components)
│   ├── dashboard/
│   │   ├── portfolio-summary.tsx
│   │   ├── drift-chart.tsx
│   │   └── alert-badge.tsx
│   ├── ips/
│   │   └── ips-wizard.tsx
│   ├── portfolio/
│   │   ├── position-table.tsx
│   │   └── transaction-form.tsx
│   └── proposals/
│       └── pac-proposal-card.tsx
├── lib/
│   ├── api-client.ts
│   └── utils.ts
└── public/
```

**Dipendenze principali:**
```json
{
  "next": "^14.1.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@tanstack/react-query": "^5.17.0",
  "@tanstack/react-table": "^8.11.0",
  "recharts": "^2.10.0",
  "zod": "^3.22.0",
  "react-hook-form": "^7.49.0",
  "@hookform/resolvers": "^3.3.0",
  "tailwindcss": "^3.4.0",
  "@aurora/types": "workspace:*",
  "@aurora/contracts": "workspace:*"
}
```

**Pagine principali:**

1. **Dashboard** (`/`) - Summary portfolio, next PAC, alerts
2. **Portfolios** (`/portfolios`) - Lista portfolios
3. **Portfolio Detail** (`/portfolios/[id]`) - Posizioni, transactions, snapshots
4. **IPS Wizard** (`/ips/wizard`) - Crea/modifica IPS
5. **Proposals** (`/proposals`) - Visualizza proposte PAC
6. **Scoring** (`/scoring`) - Trigger scoring, visualizza risultati

---

### Dockerfiles

#### infra/docker/api.Dockerfile
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

FROM base AS build
COPY . .
RUN pnpm turbo run build --filter=@aurora/api

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

#### infra/docker/ui.Dockerfile
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

FROM base AS build
COPY . .
RUN pnpm turbo run build --filter=@aurora/ui

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/apps/ui/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/ui/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

#### infra/docker/engine.Dockerfile
```dockerfile
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY services/engine/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY services/engine/src ./src

# Run worker
CMD ["python", "-m", "src.worker"]
```

---

## 📋 Prossimi Step

### Immediate (oggi)
1. ✅ Installa dipendenze: `pnpm install`
2. ✅ Avvia infra: `cd infra && docker compose up -d db redis`
3. ✅ Genera Prisma client: `cd packages/db && npx prisma generate`
4. ✅ Esegui migrazioni: `cd packages/db && npx prisma migrate dev --name init`
5. ✅ Seed DB: `cd packages/db && pnpm db:seed`

### Sprint 1 (questa settimana)
1. Implementa API base (health + IPS endpoints)
2. Implementa UI base (dashboard + IPS wizard)
3. Test end-to-end IPS creation

### Sprint 2 (settimana prossima)
1. Implementa Portfolio & Transactions (API + UI)
2. Implementa Engine base con job queue
3. Test transazioni paper

### Sprint 3 (settimane 3-4)
1. Implementa Data providers (Yahoo Finance)
2. Implementa ETF Scoring
3. Test scoring con ETF reali

### Sprint 4 (settimana 5)
1. Implementa PAC Engine
2. Test proposta PAC mensile

---

## 🎯 Quick Commands

```bash
# Install all dependencies
pnpm install

# Generate Prisma client
cd packages/db && npx prisma generate

# Run migrations
cd packages/db && npx prisma migrate dev

# Seed database
cd packages/db && pnpm db:seed

# Start infrastructure only
cd infra && docker compose up -d db redis

# Start all services (quando implementati)
pnpm docker:up
pnpm dev

# View database
pnpm db:studio

# Run tests
pnpm test

# Format code
pnpm format
```

---

## 📊 Progress Tracking

- **Overall**: ~35% completato
- **Infrastructure**: 100% ✅
- **Database**: 100% ✅
- **Shared Packages**: 100% ✅
- **API**: 0% ⏳
- **Engine**: 0% ⏳
- **UI**: 0% ⏳
- **Tests**: 0% ⏳

---

## 🔗 Resources

- [NestJS Docs](https://docs.nestjs.com)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [BullMQ Docs](https://docs.bullmq.io)
- [shadcn/ui](https://ui.shadcn.com)
- [yfinance](https://github.com/ranaroussi/yfinance)

---

**Nota**: Questo è un progetto ambizioso ma fattibile. Procedi step-by-step seguendo la roadmap. Ogni sprint è indipendente e testabile.

Buon coding! 🚀
