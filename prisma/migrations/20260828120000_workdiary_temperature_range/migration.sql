-- The daily report has to carry at least two measured outside temperatures, one of them
-- the day's lowest (191/2009. Korm. rendelet, cb). A single temperature column cannot
-- express that, so the day's low and high get their own columns.
--
-- Both are nullable and additive: every existing entry keeps the temperature it already
-- has, and code that predates these columns is unaffected.
ALTER TABLE "WorkDiary" ADD COLUMN     "temperatureMin" DOUBLE PRECISION,
ADD COLUMN     "temperatureMax" DOUBLE PRECISION;
