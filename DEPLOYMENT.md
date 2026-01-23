# AURORA - Deployment Guide

Guida completa per il deployment e test dell'intera piattaforma AURORA.

## 📋 Prerequisiti

- Docker & Docker Compose
- pnpm (Node.js package manager)
- PostgreSQL client (opzionale, per debug)
- curl e jq (per gli script di test)

## 🚀 Quick Start

### 1. Installare le dipendenze

```bash
# Installare pnpm globalmente se non già presente
npm install -g pnpm@8.15.0

# Installare tutte le dipendenze del monorepo
pnpm install
```

### 2. Configurare l'ambiente

```bash
# Copiare il file di esempio
cp .env.example .env.local

# Editare .env.local con le tue configurazioni
# Per lo sviluppo locale, i valori di default dovrebbero funzionare
```

Contenuto minimo di `.env.local`:

```env
DATABASE_URL="postgresql://aurora:aurora_dev_2024@localhost:5433/aurora"
REDIS_HOST="localhost"
REDIS_PORT=6380
CORS_ORIGIN="http://localhost:5174"
```

### 3. Setup del database

```bash
# Avviare solo i servizi di infrastruttura
cd infra
docker compose up -d db redis

# Attendere che il database sia pronto (circa 10 secondi)
sleep 10

# Generare e applicare le migrazioni Prisma
cd ../packages/db
pnpm prisma generate
pnpm prisma db push

# Opzionale: seedare il database con dati di test
pnpm prisma db seed
```

### 4. Avviare i servizi in development

#### Opzione A: Development locale (consigliato per sviluppo)

```bash
# In terminali separati:

# Terminale 1 - API
cd apps/api
pnpm dev

# Terminale 2 - UI
cd apps/ui
pnpm dev

# Terminale 3 - Engine
cd apps/engine
pip install -r requirements.txt
python main.py
```

#### Opzione B: Docker Compose (produzione-like)

```bash
cd infra
docker compose up --build
```

I servizi saranno disponibili su:
- **UI (React)**: http://localhost:5174
- **API (NestJS)**: http://localhost:3001
- **Engine (Python)**: http://localhost:8002
- **Database**: localhost:5433
- **Redis**: localhost:6380

## 🧪 Test del sistema

### Test automatizzato completo

```bash
# Eseguire lo script di test integrato
./test-system.sh
```

Lo script testa:
- Health check API
- CRUD operazioni IPS
- Gestione portfolios
- Creazione transazioni
- Ricerca strumenti
- Sistema di alerts
- Enqueue e processing jobs Engine

### Test manuali via curl

```bash
# Health check
curl http://localhost:3001/health

# List portfolios
curl http://localhost:3001/api/portfolios?userId=user_default

# Create portfolio
curl -X POST http://localhost:3001/api/portfolios \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_default","name":"My Portfolio","type":"REAL"}'

# Enqueue scoring run
curl -X POST http://localhost:3001/api/engine/run \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_default","type":"scoring"}'
```

## 📊 Verifica dello stato

### Database

```bash
# Connessione al database
psql postgresql://aurora:aurora_dev_2024@localhost:5433/aurora

# Query di esempio
SELECT COUNT(*) FROM "Instrument";
SELECT COUNT(*) FROM "Portfolio";
SELECT * FROM "EngineRun" ORDER BY "createdAt" DESC LIMIT 5;
```

### Redis (Job Queue)

```bash
# Connessione a Redis
redis-cli -p 6380

# Verificare le queue
KEYS bull:aurora-jobs:*
LLEN bull:aurora-jobs:wait
LLEN bull:aurora-jobs:active
```

### Logs

```bash
# Logs Docker Compose
cd infra
docker compose logs -f api
docker compose logs -f engine
docker compose logs -f ui

# Logs development locale
# I logs appariranno direttamente nei terminali dove hai avviato i servizi
```

## 🏗️ Architettura deployata

```
┌─────────────────────────────────────────────────────────┐
│                         Client                          │
│                    (Browser)                            │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    UI (React + Vite)                    │
│                    Port: 5174 / 80                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ API Calls
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   API (NestJS)                          │
│                      Port: 3001                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Health │ IPS │ Portfolio │ Transactions │ Engine │  │
│  │ Alerts │ Instruments                             │  │
│  └───────────────────────────────────────────────────┘  │
└───────────┬──────────────────────────────┬──────────────┘
            │                              │
            │ Database                     │ Queue Jobs
            ▼                              ▼
┌─────────────────────┐        ┌─────────────────────────┐
│   PostgreSQL 16     │        │      Redis 7            │
│   + TimescaleDB     │        │   (BullMQ Queue)        │
│    Port: 5433       │        │    Port: 6380           │
└─────────────────────┘        └───────────┬─────────────┘
                                           │
                                           │ Consume Jobs
                                           ▼
                               ┌─────────────────────────┐
                               │  Engine (Python)        │
                               │  FastAPI + Worker       │
                               │    Port: 8002           │
                               │  ┌──────────────────┐   │
                               │  │ Scoring Engine   │   │
                               │  │ PAC Engine       │   │
                               │  │ Yahoo Finance    │   │
                               │  └──────────────────┘   │
                               └─────────────────────────┘
```

## 🔧 Troubleshooting

### Errore: "Database connection failed"

```bash
# Verificare che PostgreSQL sia in esecuzione
docker compose ps db

# Riavviare il database
docker compose restart db

# Verificare la connessione
psql postgresql://aurora:aurora_dev_2024@localhost:5433/aurora
```

### Errore: "Redis connection refused"

```bash
# Verificare che Redis sia in esecuzione
docker compose ps redis

# Riavviare Redis
docker compose restart redis

# Testare la connessione
redis-cli -p 6380 ping
```

### Errore: "Port already in use"

```bash
# Trovare il processo che usa la porta
lsof -i :3001  # o 5174, 8002, ecc.

# Killare il processo
kill -9 <PID>
```

### Jobs non vengono processati

```bash
# Verificare che l'Engine worker sia in esecuzione
docker compose logs -f engine

# Verificare la queue Redis
redis-cli
> LLEN bull:aurora-jobs:wait
> LLEN bull:aurora-jobs:active
```

### Reset completo del sistema

```bash
# Fermare tutti i servizi
docker compose down -v

# Rimuovere tutti i dati
rm -rf infra/docker/volumes/*

# Riavviare da zero
docker compose up -d db redis
sleep 10
cd ../packages/db
pnpm prisma db push
pnpm prisma db seed
cd ../../infra
docker compose up --build
```

## 📦 Build per produzione

```bash
# Build di tutti i servizi
docker compose -f infra/compose.yml build

# Push su registry (se configurato)
docker compose push

# Deploy su server remoto
docker compose -f infra/compose.yml up -d
```

## 🎯 Next Steps

Dopo aver verificato che il sistema funziona:

1. **Popolare il database** con strumenti finanziari reali
2. **Configurare IPS** personale via UI
3. **Creare portfolios** e aggiungere transazioni
4. **Eseguire scoring** per ottenere raccomandazioni
5. **Generare proposte PAC** mensili

## 📚 Riferimenti

- [GUIDA_SETUP_COMPLETA.md](./GUIDA_SETUP_COMPLETA.md) - Setup dettagliato passo-passo
- [QUICK_START.md](./QUICK_START.md) - Comandi rapidi
- [AURORA_Project_Codex_v2.pdf](./AURORA_Project_Codex_v2.pdf) - Documentazione completa
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Stato implementazione

## 🆘 Supporto

Per problemi o domande:
1. Verificare i logs dei servizi
2. Consultare la sezione Troubleshooting
3. Verificare la documentazione tecnica nel Codex
