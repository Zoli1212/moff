-- Aligns the User.theme column default with prisma/schema.prisma, which has declared
-- 'corporate' since the landing -> company theme rename. The database still defaulted to
-- 'landing', a theme name the application no longer recognises.
--
-- Prisma sends its own default with every insert, so this default has not been firing in
-- practice. It only matters for inserts that bypass Prisma - which would otherwise create
-- a row pointing at a theme that no longer exists.
--
-- Existing rows are untouched: SET DEFAULT affects future inserts only.
ALTER TABLE "User" ALTER COLUMN "theme" SET DEFAULT 'corporate';
