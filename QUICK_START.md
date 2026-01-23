# 🚀 AURORA - Quick Start Guide

## 1️⃣ Setup Iniziale (5 minuti)

### Installa pnpm (se non presente)
```bash
npm install -g pnpm@8.15.0
```

### Installa dipendenze
```bash
pnpm install
```

### Copia .env
```bash
cp .env.example .env.local
```

---

## 2️⃣ Avvia Database (2 minuti)

```bash
# Avvia PostgreSQL + Redis con Docker
cd infra
docker compose up -d db redis

# Verifica che siano running
docker compose ps

# Dovresti vedere:
# aurora-db    running (healthy)
# aurora-redis running (healthy)
```

---

## 3️⃣ Setup Database (3 minuti)

```bash
# Torna alla root
cd ..

# Genera Prisma Client
cd packages/db
npx prisma generate

# Esegui migrazioni (crea tabelle)
npx prisma migrate dev --name init

# Seed dati iniziali (3 ETF, IPS, Portfolio)
pnpm db:seed

# ✅ Output atteso:
# 🌱 Seeding database...
# ✅ Cleared existing data
# ✅ Created IPS Policy: <uuid>
# ✅ Created ETF: IWDA (IE00B4L5Y983)
# ✅ Created ETF: VWCE (IE00BK5BQT80)
# ✅ Created ETF: EUNL (LU1781541179)
# ✅ Created Paper Portfolio: <uuid>
# 🎉 Seeding completed successfully!
```

---

## 4️⃣ Esplora Database (opzionale)

```bash
# Apri Prisma Studio (GUI per database)
pnpm db:studio

# Apre http://localhost:5555
# Puoi vedere:
# - ips_policy (1 record)
# - ips_policy_version (1 record)
# - instrument (3 ETF)
# - etf_metrics (3 record)
# - isin_mapping (3 record)
# - portfolio (1 paper portfolio)
```

---

## 5️⃣ Verifica Setup

```bash
# Connettiti a Postgres
docker exec -it aurora-db psql -U aurora -d aurora_dev

# Esegui query test
SELECT COUNT(*) FROM instrument;
# Dovrebbe ritornare: 3

SELECT isin, name, ticker FROM instrument;
# Dovrebbe mostrare i 3 ETF

# Esci
\q
```

---

## 6️⃣ Next Steps

Ora hai:
- ✅ Database PostgreSQL + TimescaleDB running
- ✅ Redis running
- ✅ Schema database creato
- ✅ Dati seed caricati (3 ETF top, 1 IPS, 1 Portfolio)

**Prossimi task:**

### Implementa API (NestJS)
```bash
# Crea struttura app API
cd apps/api
npm init -y
npm install @nestjs/core @nestjs/common @nestjs/platform-express
npx nest new . --skip-git

# Poi implementa endpoints (vedi IMPLEMENTATION_STATUS.md)
```

### Implementa UI (Next.js)
```bash
# Crea app Next.js
cd apps/ui
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"

# Poi implementa dashboard (vedi IMPLEMENTATION_STATUS.md)
```

### Implementa Engine (Python)
```bash
# Setup venv
cd services/engine
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
# o .venv\Scripts\activate su Windows

# Installa dipendenze
pip install fastapi uvicorn sqlalchemy psycopg2-binary pandas yfinance

# Poi implementa worker (vedi IMPLEMENTATION_STATUS.md)
```

---

## 📚 Riferimenti Veloci

| Servizio | URL | Credenziali |
|----------|-----|-------------|
| Postgres | localhost:5432 | aurora / aurora_dev_password |
| Redis | localhost:6379 | - |
| Prisma Studio | http://localhost:5555 | - |
| API (futuro) | http://localhost:3001 | - |
| UI (futuro) | http://localhost:3000 | - |

---

## 🆘 Troubleshooting

### Prisma Client non genera
```bash
cd packages/db
rm -rf node_modules
pnpm install
npx prisma generate
```

### Docker non parte
```bash
# Stop tutto
docker compose down

# Rimuovi volumi
docker compose down -v

# Restart
docker compose up -d db redis
```

### Seed fallisce
```bash
# Resetta DB
cd packages/db
npx prisma migrate reset --force

# Ri-esegui seed
pnpm db:seed
```

---

## ✅ Checklist Setup Completato

- [ ] pnpm installato
- [ ] `pnpm install` completato (tutti i workspace)
- [ ] Docker compose up db + redis (healthy)
- [ ] Prisma generate
- [ ] Prisma migrate dev
- [ ] Seed completato (3 ETF, 1 IPS, 1 Portfolio)
- [ ] Prisma Studio funzionante (opzionale)

**Se tutto è ✅ sei pronto per implementare API/UI/Engine!**

Consulta `IMPLEMENTATION_STATUS.md` per dettagli implementazione.
