-- CreateTable
CREATE TABLE "ips_policy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ips_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ips_policy_version" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "ips_policy_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument" (
    "id" TEXT NOT NULL,
    "isin" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "type" TEXT NOT NULL,
    "category" TEXT,
    "domicile" TEXT,
    "provider" TEXT,
    "isUcits" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "isin_mapping" (
    "isin" TEXT NOT NULL,
    "yahooTicker" TEXT,
    "exchange" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "isin_mapping_pkey" PRIMARY KEY ("isin")
);

-- CreateTable
CREATE TABLE "etf_metrics" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "ter" DOUBLE PRECISION,
    "aum" DOUBLE PRECISION,
    "inceptionDate" TIMESTAMP(3),
    "replicationMethod" TEXT,
    "distributionPolicy" TEXT,
    "trackingDifference" DOUBLE PRECISION,
    "trackingError" DOUBLE PRECISION,
    "avgDailyVolume" DOUBLE PRECISION,
    "avgSpread" DOUBLE PRECISION,
    "dataCompleteness" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etf_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "open" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "low" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'paper',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "priceEur" DOUBLE PRECISION NOT NULL,
    "feeEur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEur" DOUBLE PRECISION NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "avgCostEur" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_snapshot" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "totalValueEur" DOUBLE PRECISION NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "position_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dataAsof" DATE NOT NULL,
    "tradeList" JSONB NOT NULL,
    "rationale" JSONB NOT NULL,
    "inputHash" TEXT,
    "outputHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engine_run" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'queued',
    "status" TEXT NOT NULL,
    "inputParams" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engine_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT,
    "priority" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etf_scoring_result" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,
    "redFlags" JSONB NOT NULL,
    "dataAsof" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etf_scoring_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ips_policy_userId_key" ON "ips_policy"("userId");

-- CreateIndex
CREATE INDEX "ips_policy_version_policyId_isActive_idx" ON "ips_policy_version"("policyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ips_policy_version_policyId_version_key" ON "ips_policy_version"("policyId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "instrument_isin_key" ON "instrument"("isin");

-- CreateIndex
CREATE INDEX "instrument_isin_idx" ON "instrument"("isin");

-- CreateIndex
CREATE INDEX "instrument_type_category_idx" ON "instrument"("type", "category");

-- CreateIndex
CREATE UNIQUE INDEX "etf_metrics_instrumentId_key" ON "etf_metrics"("instrumentId");

-- CreateIndex
CREATE INDEX "etf_metrics_instrumentId_idx" ON "etf_metrics"("instrumentId");

-- CreateIndex
CREATE INDEX "price_history_instrumentId_date_idx" ON "price_history"("instrumentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "price_history_instrumentId_date_key" ON "price_history"("instrumentId", "date");

-- CreateIndex
CREATE INDEX "portfolio_userId_type_idx" ON "portfolio"("userId", "type");

-- CreateIndex
CREATE INDEX "transaction_portfolioId_executedAt_idx" ON "transaction"("portfolioId", "executedAt");

-- CreateIndex
CREATE INDEX "transaction_instrumentId_idx" ON "transaction"("instrumentId");

-- CreateIndex
CREATE INDEX "position_portfolioId_idx" ON "position"("portfolioId");

-- CreateIndex
CREATE UNIQUE INDEX "position_portfolioId_instrumentId_key" ON "position"("portfolioId", "instrumentId");

-- CreateIndex
CREATE INDEX "position_snapshot_portfolioId_snapshotDate_idx" ON "position_snapshot"("portfolioId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "position_snapshot_portfolioId_snapshotDate_key" ON "position_snapshot"("portfolioId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_runId_key" ON "proposal"("runId");

-- CreateIndex
CREATE INDEX "proposal_portfolioId_dataAsof_idx" ON "proposal"("portfolioId", "dataAsof");

-- CreateIndex
CREATE INDEX "proposal_runId_idx" ON "proposal"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "engine_run_runId_key" ON "engine_run"("runId");

-- CreateIndex
CREATE INDEX "engine_run_runId_idx" ON "engine_run"("runId");

-- CreateIndex
CREATE INDEX "engine_run_type_status_idx" ON "engine_run"("type", "status");

-- CreateIndex
CREATE INDEX "alert_portfolioId_acknowledged_idx" ON "alert"("portfolioId", "acknowledged");

-- CreateIndex
CREATE INDEX "alert_priority_acknowledged_idx" ON "alert"("priority", "acknowledged");

-- CreateIndex
CREATE INDEX "etf_scoring_result_runId_idx" ON "etf_scoring_result"("runId");

-- CreateIndex
CREATE INDEX "etf_scoring_result_bucket_score_idx" ON "etf_scoring_result"("bucket", "score");

-- AddForeignKey
ALTER TABLE "ips_policy_version" ADD CONSTRAINT "ips_policy_version_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ips_policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isin_mapping" ADD CONSTRAINT "isin_mapping_isin_fkey" FOREIGN KEY ("isin") REFERENCES "instrument"("isin") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etf_metrics" ADD CONSTRAINT "etf_metrics_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position" ADD CONSTRAINT "position_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position" ADD CONSTRAINT "position_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_snapshot" ADD CONSTRAINT "position_snapshot_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
