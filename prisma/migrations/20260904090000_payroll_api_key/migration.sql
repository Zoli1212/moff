-- A lekérő API kulcsai: egy külső bérszámfejtő rendszer ezzel hívja le tőlünk
-- a havi bérösszesítőt. Új tábla, meglévő adatot nem érint.
--
-- A kulcs hash-elve tárolódik (SHA-256), ahogy egy jelszó — a nyers érték csak
-- a létrehozás válaszában létezik. A `keyHash` egyedi: a lekérdezés ezen megy.
CREATE TABLE "PayrollApiKey" (
    "id" TEXT NOT NULL,
    "tenantEmail" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayrollApiKey_keyHash_key" ON "PayrollApiKey"("keyHash");

-- A hitelesítés hash szerint keres; a lista bérlőnként, a visszavontakat kihagyva.
CREATE INDEX "PayrollApiKey_keyHash_idx" ON "PayrollApiKey"("keyHash");
CREATE INDEX "PayrollApiKey_tenantEmail_revokedAt_idx" ON "PayrollApiKey"("tenantEmail", "revokedAt");
