# 📚 AURORA - Guida Setup Completa da Zero

**Obiettivo**: Imparare a costruire l'intero ambiente di sviluppo AURORA step-by-step.

**Prerequisiti**:
- macOS/Linux/Windows con WSL2
- Docker Desktop installato e funzionante
- Connessione internet

**Tempo stimato**: 2-3 ore (seguendo con calma)

---

## 📖 Indice

1. [Setup Tools Base](#1-setup-tools-base)
2. [Inizializzazione Monorepo](#2-inizializzazione-monorepo)
3. [Setup Database con Prisma](#3-setup-database-con-prisma)
4. [Creazione Packages Condivisi](#4-creazione-packages-condivisi)
5. [Setup API (NestJS)](#5-setup-api-nestjs)
6. [Setup UI (Next.js)](#6-setup-ui-nextjs)
7. [Setup Engine (Python)](#7-setup-engine-python)
8. [Docker Compose Completo](#8-docker-compose-completo)
9. [Test End-to-End](#9-test-end-to-end)
10. [Troubleshooting Comune](#10-troubleshooting-comune)

---

## 1. Setup Tools Base

### 1.1 Installazione Node.js (se non presente)

**Verifica versione attuale:**
```bash
node --version
# Serve >= 20.0.0
```

**Se non hai Node.js o versione < 20:**

**Opzione A - Via Homebrew (macOS):**
```bash
# Installa Homebrew se non presente
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installa Node.js
brew install node@20

# Verifica
node --version
npm --version
```

**Opzione B - Via nvm (consigliato per gestire multiple versioni):**
```bash
# Installa nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Ricarica shell
source ~/.bashrc  # o ~/.zshrc su macOS

# Installa Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verifica
node --version  # Deve essere v20.x.x
```

**Cosa abbiamo imparato:**
- Node.js è il runtime JavaScript che eseguirà la nostra API e UI
- npm (Node Package Manager) viene installato automaticamente con Node.js
- nvm permette di gestire multiple versioni di Node.js

---

### 1.2 Installazione pnpm

**Cos'è pnpm?**
- Package manager più veloce ed efficiente di npm
- Usa hard links per risparmiare spazio disco
- Perfetto per monorepo (gestisce workspace)

**Installazione:**
```bash
npm install -g pnpm@8.15.0

# Verifica
pnpm --version  # Deve essere 8.15.0
```

**Configurazione pnpm (opzionale ma consigliato):**
```bash
# Abilita shamefully-hoist per compatibilità
pnpm config set shamefully-hoist true

# Imposta store-dir (dove pnpm salva i pacchetti)
pnpm config set store-dir ~/.pnpm-store
```

**Cosa abbiamo imparato:**
- pnpm gestisce le dipendenze in modo più efficiente di npm
- Useremo pnpm workspace per il nostro monorepo

---

### 1.3 Installazione Python 3.11+

**Verifica versione:**
```bash
python3 --version
# Serve >= 3.11
```

**Se versione < 3.11:**

**macOS (Homebrew):**
```bash
brew install python@3.11

# Aggiungi al PATH (se necessario)
echo 'export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verifica
python3 --version
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip
```

**Cosa abbiamo imparato:**
- Python 3.11+ è necessario per l'Engine analytics
- Useremo venv per creare ambienti virtuali isolati

---

### 1.4 Installazione Git (se non presente)

```bash
# Verifica
git --version

# Se non presente (macOS):
brew install git

# Linux:
sudo apt install git
```

**Configurazione Git (prima volta):**
```bash
git config --global user.name "Tuo Nome"
git config --global user.email "tua@email.com"
```

---

### 1.5 Editor: VS Code (consigliato)

**Download**: https://code.visualstudio.com/

**Estensioni consigliate** (installa da VS Code):
- Prisma
- ESLint
- Prettier
- Python
- Docker
- Tailwind CSS IntelliSense

**Shortcut rapido per aprire VS Code:**
```bash
# Dalla directory del progetto
code .
```

**Cosa abbiamo imparato:**
- VS Code è l'editor ideale per sviluppo TypeScript/Python
- Le estensioni forniscono autocompletamento e syntax highlighting

---

## 2. Inizializzazione Monorepo

### 2.1 Creazione Directory Progetto

```bash
# Vai nella cartella progetti (modifica il path)
cd ~/Desktop/Lavoro/Progetti

# Crea directory AURORA (se non esiste già)
mkdir -p AURORA
cd AURORA

# Verifica di essere nella directory giusta
pwd
# Output: /Users/tuonome/Desktop/Lavoro/Progetti/AURORA
```

**Cosa abbiamo imparato:**
- `mkdir -p` crea directory annidate se non esistono
- `pwd` mostra il percorso corrente

---

### 2.2 Inizializzazione Git

```bash
# Inizializza repository Git
git init

# Crea .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
.next/
out/
build/

# Environment files
.env*.local
.env.production

# Python
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
*.egg-info/

# Database
*.db
*.sqlite
/data/

# Docker
/volumes/

# IDE
.vscode/
.idea/
*.swp
*.swo
*.swn

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
logs/

# Testing
coverage/
.pytest_cache/

# Turbo
.turbo/

# Temporary
*.tmp
*.temp
EOF

# Verifica
cat .gitignore
```

**Cosa abbiamo imparato:**
- `.gitignore` dice a Git quali file ignorare
- `cat > file << 'EOF'` è un modo rapido per creare file multi-riga
- Evitiamo di committare `node_modules`, `.env`, build outputs

---

### 2.3 Creazione package.json Root

**Cos'è package.json?**
- File di configurazione del progetto Node.js
- Definisce dipendenze, scripts, metadata
- In un monorepo, il root `package.json` orchestra tutti i workspace

```bash
# Crea package.json
cat > package.json << 'EOF'
{
  "name": "aurora-monorepo",
  "version": "0.1.0",
  "private": true,
  "description": "AURORA - Personal Investment Intelligence System",
  "workspaces": [
    "apps/*",
    "services/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "docker:up": "docker compose -f infra/compose.yml up -d",
    "docker:down": "docker compose -f infra/compose.yml down",
    "docker:logs": "docker compose -f infra/compose.yml logs -f"
  },
  "devDependencies": {
    "@turbo/gen": "^2.0.0",
    "turbo": "^2.0.0",
    "prettier": "^3.3.0",
    "typescript": "^5.4.0"
  },
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
EOF
```

**Spiegazione campi:**
- `workspaces`: array di glob patterns per i workspace
- `scripts`: comandi eseguibili con `pnpm <nome-script>`
- `devDependencies`: dipendenze solo per sviluppo
- `packageManager`: specifica versione pnpm
- `engines`: versioni minime richieste

**Cosa abbiamo imparato:**
- `workspaces` permette a pnpm di gestire il monorepo
- `turbo` orchesterà build/test/dev di tutti i package in parallelo

---

### 2.4 Configurazione Turbo

**Cos'è Turborepo?**
- Build system per monorepo
- Esegue task in parallelo e cachea risultati
- Gestisce dipendenze tra package

```bash
# Crea turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    }
  }
}
EOF
```

**Spiegazione pipeline:**
- `"build"`: task per compilare il codice
  - `"dependsOn": ["^build"]` → prima builda le dipendenze
  - `"outputs"` → file da cacheare
- `"dev"`: task di sviluppo (nessuna cache)
- `"test"`: esegue test dopo build

**Cosa abbiamo imparato:**
- Turbo ottimizza build guardando solo file cambiati
- `^build` significa "builda prima i package da cui dipendo"

---

### 2.5 Configurazione Prettier

**Cos'è Prettier?**
- Code formatter automatico
- Garantisce stile consistente in tutto il progetto

```bash
# Crea .prettierrc
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
EOF
```

**Spiegazione opzioni:**
- `semi: true` → usa `;` alla fine delle righe
- `singleQuote: true` → usa `'` invece di `"`
- `printWidth: 100` → max 100 caratteri per riga
- `tabWidth: 2` → 2 spazi per indentazione

---

### 2.6 Creazione Struttura Directory

```bash
# Crea tutte le directory del monorepo
mkdir -p apps/api
mkdir -p apps/ui
mkdir -p services/engine
mkdir -p packages/db/prisma
mkdir -p packages/types
mkdir -p packages/contracts
mkdir -p infra/docker
mkdir -p infra/init-scripts

# Verifica struttura
ls -R
```

**Output atteso:**
```
.:
apps  infra  package.json  packages  services  turbo.json

./apps:
api  ui

./infra:
docker  init-scripts

./packages:
contracts  db  types

./packages/db:
prisma

./services:
engine
```

**Cosa abbiamo imparato:**
- Monorepo organizzato in 3 categorie:
  - `apps/` → applicazioni deployabili (API, UI)
  - `services/` → servizi backend (Engine Python)
  - `packages/` → codice condiviso (DB, types, contracts)
- `infra/` → configurazione Docker e scripts

---

### 2.7 Installazione Dipendenze Root

```bash
# Installa dipendenze (turbo, prettier, typescript)
pnpm install

# Questo crea:
# - node_modules/
# - pnpm-lock.yaml (lockfile delle versioni)
```

**Output atteso:**
```
Packages: +XXX
Progress: resolved XXX, reused XXX, downloaded XX
Done in XXs
```

**Cosa abbiamo imparato:**
- `pnpm install` legge `package.json` e installa dipendenze
- `pnpm-lock.yaml` blocca le versioni esatte (da committare in Git)
- `node_modules/` contiene i pacchetti (NON committare)

---

### 2.8 Primo Commit Git

```bash
# Aggiungi tutti i file
git add .

# Verifica cosa verrà committato
git status

# Crea commit
git commit -m "chore: initial monorepo setup with turbo and pnpm workspaces"

# Verifica commit
git log --oneline
```

**Output git status:**
```
On branch main
Changes to be committed:
  new file:   .gitignore
  new file:   .prettierrc
  new file:   package.json
  new file:   pnpm-lock.yaml
  new file:   turbo.json
```

**Cosa abbiamo imparato:**
- `git add .` → aggiungi tutti i file non ignorati
- `git status` → vedi file staged/unstaged
- `git commit -m "messaggio"` → crea commit
- Convenzione commit: `tipo: descrizione`
  - `chore`: task di manutenzione
  - `feat`: nuova feature
  - `fix`: bugfix

---

## 3. Setup Database con Prisma

### 3.1 Cos'è Prisma?

**Prisma** è un ORM (Object-Relational Mapping) moderno:
- **Schema-first**: definisci modelli in `schema.prisma`
- **Type-safe**: genera TypeScript types automaticamente
- **Migrations**: gestisce evoluzione schema DB
- **Query builder**: scrive query SQL in TypeScript

**Workflow Prisma:**
1. Scrivi schema (`schema.prisma`)
2. Esegui `prisma migrate dev` → genera SQL migration
3. Esegui `prisma generate` → genera Prisma Client TypeScript
4. Usa Prisma Client nel codice

---

### 3.2 Creazione Package Database

```bash
# Vai nella directory db
cd packages/db

# Inizializza package.json
cat > package.json << 'EOF'
{
  "name": "@aurora/db",
  "version": "0.1.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.19.0"
  },
  "devDependencies": {
    "prisma": "^5.19.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  }
}
EOF
```

**Spiegazione dipendenze:**
- `@prisma/client`: client runtime per query DB
- `prisma`: CLI per migrations e codegen
- `tsx`: esegue TypeScript direttamente (per seed)

---

### 3.3 Creazione Schema Prisma

```bash
# Crea schema base
cat > prisma/schema.prisma << 'EOF'
// AURORA Database Schema
// PostgreSQL + TimescaleDB

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== IPS & Policy ====================

model IpsPolicy {
  id        String   @id @default(uuid())
  userId    String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  versions IpsPolicyVersion[]

  @@map("ips_policy")
}

model IpsPolicyVersion {
  id          String    @id @default(uuid())
  policyId    String
  version     String // Semantic version: 1.0.0
  config      Json // IPS JSON structure
  isActive    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  activatedAt DateTime?

  policy IpsPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)

  @@unique([policyId, version])
  @@index([policyId, isActive])
  @@map("ips_policy_version")
}

// ==================== Instruments ====================

model Instrument {
  id       String  @id @default(uuid())
  isin     String  @unique
  name     String
  ticker   String?
  currency String  @default("EUR")
  type     String // "ETF", "STOCK", "BOND"
  category String? // "equity_global", etc.
  domicile String? // "IE", "LU", etc.
  provider String? // "iShares", "Vanguard", etc.
  isUcits  Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  etfMetrics   EtfMetrics?
  isinMapping  IsinMapping?
  transactions Transaction[]
  positions    Position[]
  priceHistory PriceHistory[]

  @@index([isin])
  @@index([type, category])
  @@map("instrument")
}

model IsinMapping {
  isin           String    @id
  yahooTicker    String?
  exchange       String?
  verified       Boolean   @default(false)
  lastVerifiedAt DateTime?

  instrument Instrument @relation(fields: [isin], references: [isin], onDelete: Cascade)

  @@map("isin_mapping")
}

model EtfMetrics {
  id           String @id @default(uuid())
  instrumentId String @unique

  ter                Float?
  aum                Float?
  inceptionDate      DateTime?
  replicationMethod  String?
  distributionPolicy String?

  trackingDifference Float?
  trackingError      Float?

  avgDailyVolume Float?
  avgSpread      Float?

  dataCompleteness Float?
  lastUpdated      DateTime @default(now())

  instrument Instrument @relation(fields: [instrumentId], references: [id], onDelete: Cascade)

  @@index([instrumentId])
  @@map("etf_metrics")
}

model PriceHistory {
  id           String   @id @default(uuid())
  instrumentId String
  date         DateTime @db.Date
  close        Float
  open         Float?
  high         Float?
  low          Float?
  volume       Float?

  instrument Instrument @relation(fields: [instrumentId], references: [id], onDelete: Cascade)

  @@unique([instrumentId, date])
  @@index([instrumentId, date])
  @@map("price_history")
}

// ==================== Portfolio ====================

model Portfolio {
  id     String @id @default(uuid())
  name   String
  type   String @default("paper")
  userId String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions Transaction[]
  positions    Position[]
  snapshots    PositionSnapshot[]
  proposals    Proposal[]

  @@index([userId, type])
  @@map("portfolio")
}

model Transaction {
  id           String @id @default(uuid())
  portfolioId  String
  instrumentId String

  side      String
  quantity  Float
  priceEur  Float
  feeEur    Float  @default(0)
  totalEur  Float

  executedAt DateTime @default(now())
  note       String?

  portfolio  Portfolio  @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  instrument Instrument @relation(fields: [instrumentId], references: [id])

  @@index([portfolioId, executedAt])
  @@map("transaction")
}

model Position {
  id           String @id @default(uuid())
  portfolioId  String
  instrumentId String

  quantity   Float
  avgCostEur Float

  updatedAt DateTime @updatedAt

  portfolio  Portfolio  @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  instrument Instrument @relation(fields: [instrumentId], references: [id])

  @@unique([portfolioId, instrumentId])
  @@map("position")
}

model PositionSnapshot {
  id            String   @id @default(uuid())
  portfolioId   String
  snapshotDate  DateTime @db.Date
  totalValueEur Float

  items Json

  createdAt DateTime @default(now())

  portfolio Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)

  @@unique([portfolioId, snapshotDate])
  @@map("position_snapshot")
}

// ==================== Engine ====================

model Proposal {
  id          String @id @default(uuid())
  runId       String @unique
  portfolioId String

  type      String
  dataAsof  DateTime @db.Date

  tradeList Json
  rationale Json

  inputHash  String?
  outputHash String?

  status String @default("pending")

  createdAt  DateTime  @default(now())
  executedAt DateTime?

  portfolio Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)

  @@index([portfolioId, dataAsof])
  @@map("proposal")
}

model EngineRun {
  id    String @id @default(uuid())
  runId String @unique

  type   String
  status String @default("queued")

  inputParams Json
  result      Json?
  error       String?

  startedAt   DateTime?
  completedAt DateTime?
  durationMs  Int?

  createdAt DateTime @default(now())

  @@index([runId])
  @@map("engine_run")
}

// ==================== Alerts ====================

model Alert {
  id          String  @id @default(uuid())
  portfolioId String?

  priority String
  type     String
  title    String
  message  String
  data     Json?

  acknowledged   Boolean   @default(false)
  acknowledgedAt DateTime?

  createdAt DateTime @default(now())

  @@index([portfolioId, acknowledged])
  @@map("alert")
}

model EtfScoringResult {
  id           String @id @default(uuid())
  runId        String
  instrumentId String
  bucket       String

  score     Float
  breakdown Json
  redFlags  Json

  dataAsof  DateTime @db.Date
  createdAt DateTime @default(now())

  @@index([runId])
  @@map("etf_scoring_result")
}
EOF
```

**Spiegazione Schema:**

**Modelli principali:**
1. `IpsPolicy` & `IpsPolicyVersion` → Investment Policy versionata
2. `Instrument` → ETF/Azioni/Obbligazioni
3. `EtfMetrics` → Metriche specifiche ETF (TER, AUM, tracking)
4. `Portfolio` → Portafoglio (paper o real)
5. `Transaction` → Operazioni buy/sell
6. `Position` → Posizioni correnti
7. `Proposal` → Proposte PAC mensili
8. `Alert` → Notifiche drift/concentrazione

**Annotations Prisma:**
- `@id` → chiave primaria
- `@default(uuid())` → genera UUID automaticamente
- `@unique` → vincolo di unicità
- `@relation` → definisce relazione tra modelli
- `@@index` → crea indice DB per performance
- `@@map("nome_tabella")` → nome tabella in snake_case

**Cosa abbiamo imparato:**
- Prisma schema definisce struttura DB in modo dichiarativo
- Relations (1-to-1, 1-to-many) sono esplicite
- Prisma genera SQL automaticamente dalle migration

---

### 3.4 Creazione tsconfig.json

```bash
# Crea TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

**Spiegazione opzioni TypeScript:**
- `strict: true` → abilita tutte le check strict (raccomandato)
- `esModuleInterop: true` → compatibilità import ES6/CommonJS
- `skipLibCheck: true` → salta check `.d.ts` per velocità
- `declaration: true` → genera file `.d.ts` per types

---

### 3.5 Creazione index.ts (Prisma Client Singleton)

```bash
cat > index.ts << 'EOF'
export * from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
EOF
```

**Spiegazione pattern Singleton:**
- In development, Next.js fa hot-reload → creerebbe N istanze PrismaClient
- Singleton pattern garantisce 1 sola istanza globale
- `globalThis` è l'oggetto globale (come `window` in browser)

**Cosa abbiamo imparato:**
- PrismaClient è la classe per query DB
- Singleton evita memory leak in development
- Logging configurabile (query SQL solo in dev)

---

### 3.6 Installazione Dipendenze Package DB

```bash
# Installa dipendenze locali del package db
pnpm install

# Questo legge package.json e installa:
# - @prisma/client
# - prisma (devDep)
# - tsx (devDep)
```

**Output atteso:**
```
Scope: @aurora/db
Progress: resolved X, reused X, downloaded X
+ @prisma/client 5.19.0
+ prisma 5.19.0 (dev)
+ tsx 4.7.0 (dev)
```

**Cosa abbiamo imparato:**
- Ogni workspace ha il suo `package.json` e `node_modules`
- pnpm collega dependencies comuni per risparmiare spazio

---

### 3.7 Torna alla Root

```bash
cd ../..
# Ora sei in AURORA/
pwd
# Output: /Users/.../AURORA
```

---

### 3.8 Commit Progresso

```bash
git add packages/db
git commit -m "feat(db): setup prisma schema with 13 models"
```

---

## 4. Creazione Packages Condivisi

### 4.1 Package Types (@aurora/types)

```bash
cd packages/types

# Crea package.json
cat > package.json << 'EOF'
{
  "name": "@aurora/types",
  "version": "0.1.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
EOF

# Crea index.ts con types
cat > index.ts << 'EOF'
// AURORA Shared Types

export interface IpsConfig {
  version: string;
  profile: 'conservativo' | 'moderato' | 'aggressivo';
  phase: 'ETF-only' | 'ETF-stocks';
  horizon_years: number;
  pac_monthly_eur: {
    min: number;
    max: number;
    default: number;
  };
  targets: Array<{
    bucket: string;
    weight: number;
    description?: string;
  }>;
  rebalance: {
    mode: 'contributi-only' | 'full';
    frequency: 'monthly' | 'quarterly';
    bands: {
      asset_class_abs: number;
      instrument_abs: number;
    };
  };
  constraints: {
    min_instruments: number;
    max_instruments: number;
    max_single_instrument_weight: number;
  };
}

export interface Position {
  instrumentId: string;
  instrumentName: string;
  isin: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  currentValue: number;
  weight: number;
}

export interface PortfolioSummary {
  portfolioId: string;
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  totalReturnPct: number;
  positions: Position[];
}

export interface TransactionInput {
  instrumentId: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  priceEur: number;
  feeEur?: number;
  executedAt?: Date;
  note?: string;
}

export type EngineJobType = 'ETF_SCORING' | 'PORTFOLIO_PROPOSAL' | 'MONTHLY_PAC';

export interface PacProposal {
  runId: string;
  type: 'MONTHLY_PAC';
  dataAsof: string;
  tradeList: Array<{
    instrumentId: string;
    instrumentName: string;
    side: 'BUY' | 'SELL';
    amountEur: number;
  }>;
  rationale: {
    totalValuePreTrade: number;
    contribution: number;
    driftSnapshot: Array<{
      instrumentId: string;
      targetWeight: number;
      currentWeight: number;
      drift: number;
    }>;
    constraintsPassed: boolean;
  };
}

export type AlertPriority = 'high' | 'medium' | 'low';

export interface Alert {
  id: string;
  priority: AlertPriority;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  acknowledged: boolean;
  createdAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
EOF

# Crea tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Torna alla root
cd ../..
```

**Cosa abbiamo imparato:**
- Package `types` esporta TypeScript interfaces/types
- Centralizzare types evita duplicazione
- Altri package possono importare: `import { IpsConfig } from '@aurora/types'`

---

### 4.2 Package Contracts (@aurora/contracts)

**Cos'è Zod?**
- Libreria validation TypeScript
- Definisci schema → valida dati runtime
- Genera TypeScript types automaticamente

```bash
cd packages/contracts

# Crea package.json
cat > package.json << 'EOF'
{
  "name": "@aurora/contracts",
  "version": "0.1.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
EOF

# Crea index.ts
cat > index.ts << 'EOF'
import { z } from 'zod';

// IPS Config Schema
export const IpsConfigSchema = z.object({
  version: z.string(),
  profile: z.enum(['conservativo', 'moderato', 'aggressivo']),
  phase: z.enum(['ETF-only', 'ETF-stocks']),
  horizon_years: z.number().int().positive(),
  pac_monthly_eur: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    default: z.number().positive(),
  }),
  targets: z.array(
    z.object({
      bucket: z.string(),
      weight: z.number().min(0).max(1),
      description: z.string().optional(),
    })
  ),
  rebalance: z.object({
    mode: z.enum(['contributi-only', 'full']),
    frequency: z.enum(['monthly', 'quarterly']),
    bands: z.object({
      asset_class_abs: z.number().min(0).max(1),
      instrument_abs: z.number().min(0).max(1),
    }),
  }),
  constraints: z.object({
    min_instruments: z.number().int().positive(),
    max_instruments: z.number().int().positive(),
    max_single_instrument_weight: z.number().min(0).max(1),
  }),
});

// Transaction Schema
export const CreateTransactionSchema = z.object({
  instrumentId: z.string().uuid(),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  priceEur: z.number().positive(),
  feeEur: z.number().min(0).optional().default(0),
  executedAt: z.string().datetime().optional(),
  note: z.string().optional(),
});

// Engine Job Schema
export const RunEngineSchema = z.object({
  type: z.enum(['ETF_SCORING', 'PORTFOLIO_PROPOSAL', 'MONTHLY_PAC']),
  portfolioId: z.string().uuid().optional(),
  params: z.record(z.any()),
});

// Export inferred types
export type IpsConfig = z.infer<typeof IpsConfigSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type RunEngineInput = z.infer<typeof RunEngineSchema>;
EOF

# Crea tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Installa zod
pnpm install

# Torna alla root
cd ../..
```

**Cosa abbiamo imparato:**
- Zod schema = validation + type inference
- `z.infer<typeof Schema>` estrae TypeScript type
- Usato in API per validare request body

---

### 4.3 Commit Packages

```bash
git add packages/types packages/contracts
git commit -m "feat(packages): add shared types and zod validation contracts"
```

---

## 5. Setup API (NestJS)

### 5.1 Cos'è NestJS?

**NestJS** è un framework Node.js per costruire API:
- Architettura modulare (simile ad Angular)
- TypeScript-first
- Dependency Injection built-in
- Supporta decorators (@Get, @Post, ecc.)
- Integrazione Swagger (OpenAPI) automatica

**Struttura NestJS:**
- **Module**: raggruppa funzionalità correlate
- **Controller**: gestisce HTTP requests
- **Service**: logica business
- **Provider**: servizi iniettabili (DB, queue, ecc.)

---

### 5.2 Installazione NestJS CLI

```bash
# Installa NestJS CLI globalmente
pnpm add -g @nestjs/cli

# Verifica
nest --version
```

---

### 5.3 Creazione App NestJS

```bash
# Vai in apps/api
cd apps/api

# Genera app NestJS (rispondere alle domande)
npx @nestjs/cli new . --skip-git --package-manager pnpm

# Quando chiede il nome del progetto: "api"
# Package manager: pnpm
```

**Output:**
```
? What name would you like to use for the new project? api
? Which package manager would you ❤️  to use? pnpm
✔ Installation in progress... ☕

🚀  Successfully created project api
👉  Get started with the following commands:

$ cd api
$ pnpm run start
```

**Cosa è stato creato:**
```
apps/api/
├── src/
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .eslintrc.js
```

---

### 5.4 Configurazione API (modifiche)

**a) Modifica main.ts per porta 3001:**

```bash
cat > src/main.ts << 'EOF'
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global validation pipe (usa Zod schemas)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('AURORA API')
    .setDescription('Personal Investment Intelligence System API')
    .setVersion('0.1.0')
    .addTag('ips', 'Investment Policy Statement')
    .addTag('portfolios', 'Portfolio Management')
    .addTag('transactions', 'Transactions')
    .addTag('engine', 'Analytics Engine')
    .addTag('alerts', 'Alerts & Notifications')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 AURORA API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
EOF
```

**Cosa fa questo codice:**
- `enableCors()` → permette requests da frontend (localhost:3000)
- `ValidationPipe` → valida automaticamente request body
- Swagger → genera docs API automaticamente su `/api/docs`
- Porta 3001 (evita conflitto con UI su 3000)

---

**b) Installa dipendenze aggiuntive:**

```bash
# Swagger
pnpm add @nestjs/swagger

# Prisma integration
pnpm add @aurora/db@workspace:*

# BullMQ (job queue)
pnpm add @nestjs/bullmq bullmq

# Config
pnpm add @nestjs/config

# Validation
pnpm add class-validator class-transformer zod
```

---

**c) Crea modulo Health:**

```bash
# Genera health module
npx nest generate module health
npx nest generate controller health
```

**Modifica src/health/health.controller.ts:**

```bash
cat > src/health/health.controller.ts << 'EOF'
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { prisma } from '@aurora/db';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  async healthCheck() {
    // Check DB connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message,
      };
    }
  }
}
EOF
```

**Cosa fa:**
- `@Controller('health')` → route `/health`
- `@Get()` → HTTP GET
- `@ApiTags` e `@ApiOperation` → metadata Swagger
- `prisma.$queryRaw` → query raw SQL per testare connessione

---

**d) Configura .env.local:**

```bash
# Torna alla root API
cd ../..  # Ora in AURORA/

# Crea .env.local
cat > .env.local << 'EOF'
# Database
DATABASE_URL="postgresql://aurora:aurora_dev_password@localhost:5432/aurora_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# API
PORT=3001
NODE_ENV=development
EOF
```

---

**e) Modifica apps/api/package.json scripts:**

Apri `apps/api/package.json` e modifica lo script `start:dev`:

```json
{
  "scripts": {
    "start:dev": "dotenv -e ../../.env.local -- nest start --watch"
  }
}
```

Installa dotenv-cli:

```bash
cd apps/api
pnpm add -D dotenv-cli
cd ../..
```

---

### 5.5 Test API Locale (senza Docker)

Prima di Docker, testiamo che l'API funzioni:

```bash
# Assicurati di avere Postgres running (vedi sezione 8)
# Oppure usa Docker solo per DB:
# docker run -d --name aurora-db-temp -p 5432:5432 \
#   -e POSTGRES_PASSWORD=aurora_dev_password \
#   -e POSTGRES_DB=aurora_dev \
#   -e POSTGRES_USER=aurora \
#   postgres:16

# Vai in apps/api
cd apps/api

# Avvia in dev mode
pnpm run start:dev
```

**Output atteso:**
```
[Nest] 12345  - LOG [NestFactory] Starting Nest application...
[Nest] 12345  - LOG [InstanceLoader] AppModule dependencies initialized
🚀 AURORA API running on: http://localhost:3001
📚 Swagger docs: http://localhost:3001/api/docs
```

**Test healthcheck:**

```bash
# In un altro terminale
curl http://localhost:3001/health

# Output:
# {
#   "status": "ok",
#   "timestamp": "2026-01-02T...",
#   "database": "connected"
# }
```

**Apri Swagger:**
- Browser: http://localhost:3001/api/docs
- Dovresti vedere UI interattiva con endpoint `/health`

**Ferma server:** Ctrl+C nel terminale

**Cosa abbiamo imparato:**
- NestJS compila TypeScript on-the-fly in dev mode
- Hot-reload automatico al salvataggio file
- Swagger docs auto-generate da decorators

---

### 5.6 Commit API Base

```bash
# Torna alla root
cd ../..

git add apps/api .env.local
git commit -m "feat(api): setup NestJS with health endpoint and swagger"
```

---

## 6. Setup UI (Next.js)

### 6.1 Cos'è Next.js?

**Next.js** è un framework React:
- **SSR** (Server-Side Rendering) per performance
- **App Router** (Next.js 14+): routing basato su filesystem
- **Server Components**: rendering lato server per default
- **API Routes**: endpoint API dentro Next.js
- Ottimizzazioni automatiche (code splitting, image optimization)

---

### 6.2 Creazione App Next.js

```bash
cd apps/ui

# Crea app Next.js
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git

# Opzioni:
# ✔ Would you like to use TypeScript? Yes
# ✔ Would you like to use ESLint? Yes
# ✔ Would you like to use Tailwind CSS? Yes
# ✔ Would you like to use `src/` directory? Yes
# ✔ Would you like to use App Router? Yes
# ✔ Would you like to customize the default import alias? Yes (@/*)
```

**Output:**
```
Creating a new Next.js app in /Users/.../AURORA/apps/ui

✔ Installation completed
Success! Created ui at /Users/.../AURORA/apps/ui
```

**Struttura creata:**
```
apps/ui/
├── src/
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx
│       └── globals.css
├── public/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── postcss.config.js
```

---

### 6.3 Installa Dipendenze UI

```bash
# shadcn/ui (components UI)
pnpm add -D @types/node

# TanStack Query (data fetching)
pnpm add @tanstack/react-query

# TanStack Table (tabelle)
pnpm add @tanstack/react-table

# Forms
pnpm add react-hook-form @hookform/resolvers zod

# Charts
pnpm add recharts

# Icons
pnpm add lucide-react

# Utils
pnpm add clsx tailwind-merge

# Workspace packages
pnpm add @aurora/types@workspace:* @aurora/contracts@workspace:*
```

---

### 6.4 Configura shadcn/ui

**shadcn/ui** è una collezione di components copy-paste:

```bash
# Inizializza shadcn/ui
npx shadcn-ui@latest init

# Domande:
# ✔ Would you like to use TypeScript? yes
# ✔ Which style would you like to use? Default
# ✔ Which color would you like to use as base color? Slate
# ✔ Where is your global CSS file? src/app/globals.css
# ✔ Would you like to use CSS variables for colors? yes
# ✔ Where is your tailwind.config.js located? tailwind.config.ts
# ✔ Configure the import alias for components: @/components
# ✔ Configure the import alias for utils: @/lib/utils
```

**Installa alcuni components base:**

```bash
# Button, Card, Table, Badge
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add alert
```

**Cosa fa:** copia i component in `src/components/ui/`

---

### 6.5 Configura API Client

```bash
# Crea lib/api-client.ts
mkdir -p src/lib

cat > src/lib/api-client.ts << 'EOF'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async post<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
EOF
```

**Cosa fa:**
- Wrapper attorno a `fetch` API
- Centralizza base URL e headers
- Error handling

---

### 6.6 Modifica Homepage (Dashboard Placeholder)

```bash
cat > src/app/page.tsx << 'EOF'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6">AURORA Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">€0.00</p>
            <p className="text-sm text-muted-foreground">No positions yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Return</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">€0.00</p>
            <p className="text-sm text-muted-foreground">0.00%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">0 unread</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            <li>Create your Investment Policy Statement (IPS)</li>
            <li>Create a paper portfolio</li>
            <li>Add your first ETF</li>
            <li>Generate monthly PAC proposal</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
EOF
```

---

### 6.7 Aggiungi Query Provider (TanStack Query)

```bash
# Crea providers/query-provider.tsx
mkdir -p src/providers

cat > src/providers/query-provider.tsx << 'EOF'
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
EOF
```

**Modifica src/app/layout.tsx:**

```bash
cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AURORA - Investment Intelligence',
  description: 'Personal Investment Intelligence System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
EOF
```

**Cosa fa TanStack Query:**
- Cache automatica delle API calls
- Refetch automatico
- Loading/error states
- Mutations (POST/PUT/DELETE)

---

### 6.8 Configura .env.local per UI

```bash
# Torna alla root
cd ../..

# Aggiungi variabile API URL a .env.local
cat >> .env.local << 'EOF'

# Next.js UI
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
```

---

### 6.9 Test UI Locale

```bash
cd apps/ui
pnpm run dev
```

**Output:**
```
  ▲ Next.js 14.1.0
  - Local:        http://localhost:3000

 ✓ Ready in 2.3s
```

**Apri browser:** http://localhost:3000

Dovresti vedere il dashboard con 3 card e "Getting Started".

**Ferma server:** Ctrl+C

---

### 6.10 Commit UI Base

```bash
cd ../..
git add apps/ui .env.local
git commit -m "feat(ui): setup Next.js 14 with shadcn/ui and TanStack Query"
```

---

## 7. Setup Engine (Python)

### 7.1 Creazione Ambiente Virtuale

```bash
cd services/engine

# Crea virtual environment
python3 -m venv .venv

# Attiva venv
source .venv/bin/activate  # macOS/Linux
# Windows: .venv\Scripts\activate

# Verifica
which python
# Output: /Users/.../AURORA/services/engine/.venv/bin/python
```

**Cosa abbiamo imparato:**
- venv crea ambiente Python isolato
- Evita conflitti tra progetti
- Dipendenze installate solo in `.venv/`

---

### 7.2 Creazione requirements.txt

```bash
cat > requirements.txt << 'EOF'
# Web Framework
fastapi==0.110.0
uvicorn[standard]==0.27.0

# Database
sqlalchemy==2.0.25
psycopg2-binary==2.9.9

# Data Science
pandas==2.2.0
numpy==1.26.3

# Finance Data
yfinance==0.2.36

# Validation
pydantic==2.6.0
pydantic-settings==2.1.0

# Queue
redis==5.0.1

# HTTP
requests==2.31.0
beautifulsoup4==4.12.3

# Testing
pytest==8.0.0
pytest-asyncio==0.23.0

# Utils
python-dotenv==1.0.0
EOF
```

---

### 7.3 Installazione Dipendenze

```bash
# Upgrade pip
pip install --upgrade pip

# Installa requirements
pip install -r requirements.txt
```

**Output:**
```
Collecting fastapi==0.110.0
...
Successfully installed fastapi-0.110.0 uvicorn-0.27.0 ...
```

---

### 7.4 Creazione Struttura Engine

```bash
# Crea directory
mkdir -p src/data/providers
mkdir -p src/scoring
mkdir -p src/pac
mkdir -p src/jobs
mkdir -p tests

# Crea __init__.py (rende directory Python package)
touch src/__init__.py
touch src/data/__init__.py
touch src/data/providers/__init__.py
touch src/scoring/__init__.py
touch src/pac/__init__.py
touch src/jobs/__init__.py
```

---

### 7.5 Configurazione (config.py)

```bash
cat > src/config.py << 'EOF'
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://aurora:aurora_dev_password@localhost:5432/aurora_dev"
    redis_url: str = "redis://localhost:6379"

    # Data providers
    yahoo_finance_enabled: bool = True

    # Scoring weights
    scoring_weight_costs: float = 0.35
    scoring_weight_tracking: float = 0.30
    scoring_weight_liquidity: float = 0.20
    scoring_weight_robustness: float = 0.10
    scoring_weight_preferences: float = 0.05

    class Config:
        env_file = "../../.env.local"
        case_sensitive = False


settings = Settings()
EOF
```

**Cosa fa:**
- Pydantic Settings carica variabili da `.env.local`
- Centralizza configurazione
- Type-safe (Pydantic valida)

---

### 7.6 Database Connection (database.py)

```bash
cat > src/database.py << 'EOF'
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.config import settings

# Create engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # Test connection before using
    echo=False,  # Set True to log SQL queries
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency per ottenere DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
EOF
```

**Cosa fa:**
- SQLAlchemy engine per connessione DB
- `SessionLocal` factory per creare sessioni
- `get_db()` dependency injection pattern

---

### 7.7 Health Endpoint (main.py)

```bash
cat > src/main.py << 'EOF'
from fastapi import FastAPI
from sqlalchemy import text
from src.database import engine

app = FastAPI(
    title="AURORA Engine",
    description="Analytics Engine for Investment Intelligence",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test DB connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "database": "connected",
            "service": "engine",
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "error": str(e),
        }


@app.get("/")
async def root():
    return {
        "service": "AURORA Engine",
        "version": "0.1.0",
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF
```

---

### 7.8 Test Engine Locale

```bash
# Assicurati che venv sia attivo
python src/main.py
```

**Output:**
```
INFO:     Started server process [12345]
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Test:**

```bash
# Altro terminale
curl http://localhost:8000/health

# Output:
# {
#   "status": "ok",
#   "database": "connected",
#   "service": "engine"
# }
```

**Ferma:** Ctrl+C

**Cosa abbiamo imparato:**
- FastAPI crea API REST come NestJS
- Uvicorn è l'ASGI server (come Express per Node)
- Health endpoint testa connessione DB

---

### 7.9 Deactivate venv

```bash
deactivate
cd ../..
```

---

### 7.10 Commit Engine Base

```bash
git add services/engine
git commit -m "feat(engine): setup Python FastAPI with health endpoint"
```

---

## 8. Docker Compose Completo

### 8.1 Creazione Compose File

```bash
cd infra

cat > compose.yml << 'EOF'
version: '3.9'

services:
  # PostgreSQL + TimescaleDB
  db:
    image: timescale/timescaledb:latest-pg16
    container_name: aurora-db
    environment:
      POSTGRES_USER: aurora
      POSTGRES_PASSWORD: aurora_dev_password
      POSTGRES_DB: aurora_dev
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aurora -d aurora_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - aurora-net

  # Redis (Queue & Cache)
  redis:
    image: redis:7-alpine
    container_name: aurora-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - aurora-net

volumes:
  db-data:
    driver: local
  redis-data:
    driver: local

networks:
  aurora-net:
    driver: bridge
EOF
```

**Cosa fa:**
- `db` service: Postgres 16 + TimescaleDB extension
- `redis` service: Redis 7 in append-only mode (persistenza)
- Healthchecks: Docker sa quando service è "ready"
- Volumes: dati persistono anche dopo `docker compose down`
- Network: servizi comunicano via nome (es. `db:5432`)

---

### 8.2 Init Script TimescaleDB

```bash
cat > init-scripts/01-enable-timescale.sql << 'EOF'
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'TimescaleDB extension enabled successfully';
END $$;
EOF
```

**Cosa fa:**
- Eseguito automaticamente al primo avvio container
- Abilita estensione TimescaleDB (per time series)

---

### 8.3 Avvio Infrastruttura

```bash
# Avvia solo DB e Redis
docker compose up -d db redis

# Verifica status
docker compose ps
```

**Output atteso:**
```
NAME          IMAGE                              STATUS         PORTS
aurora-db     timescale/timescaledb:latest-pg16  Up (healthy)   0.0.0.0:5432->5432/tcp
aurora-redis  redis:7-alpine                     Up (healthy)   0.0.0.0:6379->6379/tcp
```

**Cosa abbiamo imparato:**
- `docker compose up -d` → avvia in background (detached)
- `docker compose ps` → vedi status
- `(healthy)` → healthcheck passato

---

### 8.4 Verifica Connessione DB

```bash
# Connettiti a Postgres
docker exec -it aurora-db psql -U aurora -d aurora_dev

# Dovresti vedere prompt:
# aurora_dev=#

# Verifica estensione TimescaleDB
\dx

# Output dovrebbe includere:
# timescaledb | 2.x.x | ...

# Esci
\q
```

---

### 8.5 View Logs

```bash
# Logs di tutti i servizi
docker compose logs -f

# Logs solo DB
docker compose logs -f db

# Stop logs: Ctrl+C
```

---

### 8.6 Commit Infra

```bash
cd ..
git add infra
git commit -m "feat(infra): add docker compose with postgres and redis"
```

---

## 9. Test End-to-End

### 9.1 Setup Database con Prisma

```bash
# Genera Prisma Client
cd packages/db
npx prisma generate

# Esegui migrations (crea tabelle)
npx prisma migrate dev --name init
```

**Output:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "aurora_dev"

Applying migration `20260102000000_init`

Your database is now in sync with your schema.

✔ Generated Prisma Client
```

**Cosa è successo:**
- Prisma ha letto `schema.prisma`
- Generato file SQL migration in `prisma/migrations/`
- Eseguito SQL su DB (creato tabelle)
- Generato Prisma Client TypeScript in `node_modules/@prisma/client`

---

### 9.2 Seed Database

```bash
# Crea seed file (se non esiste)
cat > prisma/seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing
  await prisma.instrument.deleteMany();
  await prisma.ipsPolicy.deleteMany();
  await prisma.portfolio.deleteMany();

  console.log('✅ Cleared existing data');

  // Create IPS Policy
  const ipsPolicy = await prisma.ipsPolicy.create({
    data: {
      userId: 'user_default',
      versions: {
        create: {
          version: '1.0.0',
          isActive: true,
          activatedAt: new Date(),
          config: {
            version: '1.0.0',
            profile: 'aggressivo',
            phase: 'ETF-only',
            horizon_years: 4,
            pac_monthly_eur: { min: 150, max: 200, default: 200 },
            targets: [{ bucket: 'equity_global', weight: 1.0 }],
            rebalance: {
              mode: 'contributi-only',
              frequency: 'monthly',
              bands: { asset_class_abs: 0.05, instrument_abs: 0.03 },
            },
            constraints: {
              min_instruments: 1,
              max_instruments: 3,
              max_single_instrument_weight: 1.0,
            },
          },
        },
      },
    },
  });

  console.log('✅ Created IPS Policy');

  // Create ETFs
  const etfs = [
    {
      isin: 'IE00B4L5Y983',
      name: 'iShares Core MSCI World UCITS ETF USD (Acc)',
      ticker: 'IWDA',
      yahooTicker: 'IWDA.AS',
      ter: 0.2,
      aum: 62_000_000_000,
    },
    {
      isin: 'IE00BK5BQT80',
      name: 'Vanguard FTSE All-World UCITS ETF USD (Acc)',
      ticker: 'VWCE',
      yahooTicker: 'VWCE.DE',
      ter: 0.22,
      aum: 15_000_000_000,
    },
  ];

  for (const etf of etfs) {
    await prisma.instrument.create({
      data: {
        isin: etf.isin,
        name: etf.name,
        ticker: etf.ticker,
        type: 'ETF',
        category: 'equity_global',
        domicile: 'IE',
        isUcits: true,
        isinMapping: {
          create: {
            yahooTicker: etf.yahooTicker,
            exchange: 'XETRA',
            verified: true,
          },
        },
        etfMetrics: {
          create: {
            ter: etf.ter,
            aum: etf.aum,
            replicationMethod: 'Physical',
            distributionPolicy: 'Accumulating',
            dataCompleteness: 0.9,
          },
        },
      },
    });
    console.log(`✅ Created ETF: ${etf.ticker}`);
  }

  // Create Portfolio
  await prisma.portfolio.create({
    data: {
      name: 'Portfolio Paper',
      type: 'paper',
      userId: 'user_default',
    },
  });

  console.log('✅ Created Paper Portfolio');
  console.log('\n🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

# Esegui seed
pnpm db:seed
```

**Output:**
```
🌱 Seeding database...
✅ Cleared existing data
✅ Created IPS Policy
✅ Created ETF: IWDA
✅ Created ETF: VWCE
✅ Created Paper Portfolio

🎉 Seeding completed!
```

---

### 9.3 Verifica Dati con Prisma Studio

```bash
# Apri Prisma Studio
pnpm db:studio
```

**Browser:** http://localhost:5555

Dovresti vedere:
- `ips_policy`: 1 record
- `ips_policy_version`: 1 record
- `instrument`: 2 ETF
- `etf_metrics`: 2 record
- `isin_mapping`: 2 record
- `portfolio`: 1 paper portfolio

**Cosa abbiamo imparato:**
- Prisma Studio è una GUI per esplorare DB
- Puoi creare/modificare/cancellare record manualmente

---

### 9.4 Test API

```bash
# Torna alla root
cd ../..

# Avvia API
cd apps/api
pnpm run start:dev
```

**Altro terminale:**

```bash
# Test health
curl http://localhost:3001/health

# Apri Swagger
open http://localhost:3001/api/docs
```

---

### 9.5 Test UI

```bash
# Altro terminale
cd apps/ui
pnpm run dev

# Apri browser
open http://localhost:3000
```

**Dovresti vedere il dashboard.**

---

### 9.6 Test Engine

```bash
# Attiva venv
cd services/engine
source .venv/bin/activate

# Avvia FastAPI
python src/main.py
```

**Altro terminale:**

```bash
curl http://localhost:8000/health
```

---

### 9.7 Ferma Tutto

```bash
# Ferma API, UI, Engine: Ctrl+C in ogni terminale

# Ferma Docker
cd infra
docker compose down

# (Opzionale) Rimuovi volumi (cancella dati)
docker compose down -v
```

---

## 10. Troubleshooting Comune

### 10.1 Docker: "port already allocated"

**Problema:** Porta 5432 (Postgres) o 6379 (Redis) già in uso.

**Soluzione:**

```bash
# Trova processo su porta 5432
lsof -i :5432

# Killa processo
kill -9 <PID>

# Oppure cambia porta in compose.yml:
# ports:
#   - "5433:5432"  # Porta host:container
```

---

### 10.2 Prisma: "Error: P1001 Can't reach database"

**Problema:** DB non running o credenziali sbagliate.

**Soluzione:**

```bash
# Verifica DB running
docker compose ps

# Verifica DATABASE_URL in .env.local
cat .env.local | grep DATABASE_URL

# Dovrebbe essere:
# DATABASE_URL="postgresql://aurora:aurora_dev_password@localhost:5432/aurora_dev"

# Test connessione manuale
docker exec -it aurora-db psql -U aurora -d aurora_dev
```

---

### 10.3 pnpm: "No matching version found"

**Problema:** Package non esiste o typo.

**Soluzione:**

```bash
# Cancella lock e node_modules
rm pnpm-lock.yaml
rm -rf node_modules

# Reinstalla
pnpm install
```

---

### 10.4 Python venv: command not found

**Problema:** venv non attivato.

**Soluzione:**

```bash
# Assicurati di essere in services/engine
cd services/engine

# Attiva
source .venv/bin/activate

# Verifica
which python
# Deve puntare a .venv/bin/python
```

---

### 10.5 Next.js: "Module not found"

**Problema:** Dependency non installata.

**Soluzione:**

```bash
cd apps/ui

# Reinstalla
pnpm install

# Se persiste, verifica tsconfig paths:
cat tsconfig.json | grep paths
```

---

### 10.6 Git: "Please tell me who you are"

**Soluzione:**

```bash
git config --global user.name "Tuo Nome"
git config --global user.email "tua@email.com"
```

---

## 🎉 Congratulazioni!

Hai completato il setup completo di AURORA! Ora hai:

✅ Monorepo con Turbo e pnpm
✅ Database Postgres + TimescaleDB
✅ Redis per queue
✅ Prisma ORM con migrations
✅ API NestJS con Swagger
✅ UI Next.js con shadcn/ui
✅ Engine Python con FastAPI
✅ Docker Compose orchestrazione
✅ Shared packages (types, contracts, db)

---

## 📚 Next Steps

### Prossime implementazioni:

1. **IPS Management (API + UI)**
   - Controller NestJS per CRUD IPS
   - Wizard UI multi-step

2. **Portfolio & Transactions**
   - Portfolio service
   - Transaction service
   - Position calculation

3. **Data Providers (Engine)**
   - Yahoo Finance integration
   - ISIN mapper
   - Price fetching job

4. **ETF Scoring (Engine)**
   - Filtri hard
   - Algoritmo scoring
   - Job BullMQ

5. **PAC Engine**
   - Drift calculation
   - Contributi-only algorithm
   - Proposal generation

6. **Alert System**
   - Alert generator
   - Email notifications (opzionale)

---

## 📖 Risorse Utili

- **Prisma**: https://www.prisma.io/docs
- **NestJS**: https://docs.nestjs.com
- **Next.js**: https://nextjs.org/docs
- **TanStack Query**: https://tanstack.com/query/latest
- **shadcn/ui**: https://ui.shadcn.com
- **FastAPI**: https://fastapi.tiangolo.com
- **Docker Compose**: https://docs.docker.com/compose

---

## 🆘 Se Hai Problemi

1. Controlla che Docker sia running
2. Verifica `.env.local` (credenziali corrette)
3. Assicurati che porte 3000, 3001, 5432, 6379, 8000 siano libere
4. Riavvia tutto: `docker compose down && docker compose up -d`

---

**Happy Coding! 🚀**
