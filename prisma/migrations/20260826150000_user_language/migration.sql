-- Stores the UI language on the account rather than in the browser, so the choice
-- follows the user to any machine. Additive with a default, so every existing row keeps
-- the Hungarian the product already spoke.
ALTER TABLE "User" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'hu';
