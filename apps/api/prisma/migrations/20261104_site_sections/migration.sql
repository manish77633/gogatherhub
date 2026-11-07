ALTER TABLE "HomepageSection" ADD COLUMN "pageKey" VARCHAR(80) NOT NULL DEFAULT 'home';
DROP INDEX "HomepageSection_key_key";
DROP INDEX "HomepageSection_position_idx";
CREATE UNIQUE INDEX "HomepageSection_pageKey_key_key" ON "HomepageSection"("pageKey", "key");
CREATE INDEX "HomepageSection_pageKey_position_idx" ON "HomepageSection"("pageKey", "position");
