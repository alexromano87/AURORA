# AURORA - Personal Investment Intelligence System

Sistema operativo personale per gestione portafoglio ETF con PAC automatizzato.

## 🏗️ Architettura

```
AURORA/
├── apps/
│   ├── api/          # NestJS API Backend
│   └── ui/           # Next.js Dashboard
├── services/
│   └── engine/       # Python Analytics Engine
├── packages/
│   ├── db/           # Prisma Schema & Migrations
│   ├── types/        # Shared TypeScript Types
│   └── contracts/    # API Contracts (Zod)
└── infra/
    ├── compose.yml   # Docker Compose
    └── docker/       # Dockerfiles
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose
- Python 3.11+

### Installation

```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres, Redis, TimescaleDB)
pnpm docker:up

# Run database migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed

# Start all services in dev mode
pnpm dev
```

### Services

- **UI**: http://localhost:3000
- **API**: http://localhost:3001
- **Prisma Studio**: `pnpm db:studio`

## 📦 Stack

- **Frontend**: Next.js 14, React, TailwindCSS, shadcn/ui
- **Backend**: NestJS, Prisma, BullMQ
- **Engine**: Python, FastAPI, pandas, yfinance
- **Database**: PostgreSQL 16 + TimescaleDB
- **Queue/Cache**: Redis 7

## 📋 Development

```bash
# Run tests
pnpm test

# Lint & format
pnpm lint
pnpm format

# View logs
pnpm docker:logs

# Stop services
pnpm docker:down
```

## 📖 Documentation

Vedi `AURORA_Project_Codex_v2.pdf` per documentazione tecnica completa.

## 🗺️ Roadmap

- [x] Sprint 0: Bootstrap & Infrastructure
- [ ] Sprint 1: IPS + Paper Portfolio
- [ ] Sprint 2: Data Sourcing + Universe
- [ ] Sprint 3: ETF Scoring
- [ ] Sprint 4: PAC Engine
- [ ] Sprint 5: Alerts & Monitoring

## 📄 License

Uso personale - All rights reserved
