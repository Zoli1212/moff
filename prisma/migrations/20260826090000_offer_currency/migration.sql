-- Adds currency to offers. Both columns are additive with safe defaults, so code that
-- predates them keeps working unchanged and every existing offer stays HUF.
ALTER TABLE "Offer" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'HUF',
ADD COLUMN     "exchangeRate" DOUBLE PRECISION;
