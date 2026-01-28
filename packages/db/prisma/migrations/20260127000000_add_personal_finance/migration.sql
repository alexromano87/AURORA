-- CreateTable
CREATE TABLE "bank_account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CHECKING',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "icon" TEXT,
    "linkedPortfolioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_balance_history" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "account_balance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_category" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "nameIt" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "parentId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "amountEur" DOUBLE PRECISION NOT NULL,
    "categoryId" TEXT,
    "merchant" TEXT,
    "description" TEXT,
    "note" TEXT,
    "transferToAccountId" TEXT,
    "transferFromAccountId" TEXT,
    "linkedTransferId" TEXT,
    "llmCategorized" BOOLEAN NOT NULL DEFAULT false,
    "llmConfidence" DOUBLE PRECISION,
    "llmSuggestedCategory" TEXT,
    "importBatchId" TEXT,
    "importSource" TEXT,
    "externalId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "mapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_analysis_cache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_analysis_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spending_alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_account_userId_isActive_idx" ON "bank_account"("userId", "isActive");

-- CreateIndex
CREATE INDEX "account_balance_history_accountId_date_idx" ON "account_balance_history"("accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "account_balance_history_accountId_date_key" ON "account_balance_history"("accountId", "date");

-- CreateIndex
CREATE INDEX "expense_category_userId_isActive_idx" ON "expense_category"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "expense_category_userId_name_key" ON "expense_category"("userId", "name");

-- CreateIndex
CREATE INDEX "personal_transaction_userId_transactionDate_idx" ON "personal_transaction"("userId", "transactionDate");

-- CreateIndex
CREATE INDEX "personal_transaction_accountId_transactionDate_idx" ON "personal_transaction"("accountId", "transactionDate");

-- CreateIndex
CREATE INDEX "personal_transaction_categoryId_idx" ON "personal_transaction"("categoryId");

-- CreateIndex
CREATE INDEX "personal_transaction_importBatchId_idx" ON "personal_transaction"("importBatchId");

-- CreateIndex
CREATE INDEX "import_batch_userId_createdAt_idx" ON "import_batch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "llm_analysis_cache_expiresAt_idx" ON "llm_analysis_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "llm_analysis_cache_userId_type_inputHash_key" ON "llm_analysis_cache"("userId", "type", "inputHash");

-- CreateIndex
CREATE INDEX "spending_alert_userId_acknowledged_idx" ON "spending_alert"("userId", "acknowledged");

-- AddForeignKey
ALTER TABLE "account_balance_history" ADD CONSTRAINT "account_balance_history_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "bank_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_category" ADD CONSTRAINT "expense_category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "expense_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_transaction" ADD CONSTRAINT "personal_transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "bank_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_transaction" ADD CONSTRAINT "personal_transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_transaction" ADD CONSTRAINT "personal_transaction_transferToAccountId_fkey" FOREIGN KEY ("transferToAccountId") REFERENCES "bank_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_transaction" ADD CONSTRAINT "personal_transaction_transferFromAccountId_fkey" FOREIGN KEY ("transferFromAccountId") REFERENCES "bank_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
