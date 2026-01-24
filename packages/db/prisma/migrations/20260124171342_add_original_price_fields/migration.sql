-- AlterTable
ALTER TABLE "price_history" ADD COLUMN "originalClose" DOUBLE PRECISION,
ADD COLUMN "originalOpen" DOUBLE PRECISION,
ADD COLUMN "originalHigh" DOUBLE PRECISION,
ADD COLUMN "originalLow" DOUBLE PRECISION,
ADD COLUMN "originalCurrency" TEXT;

-- Add comment
COMMENT ON COLUMN "price_history"."close" IS 'Prezzo in EUR (convertito se necessario)';
COMMENT ON COLUMN "price_history"."originalClose" IS 'Prezzo originale (null se già in EUR)';
COMMENT ON COLUMN "price_history"."originalCurrency" IS 'Valuta originale (null se EUR)';
