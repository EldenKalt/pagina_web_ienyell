-- Missing prerequisite for the blog's existing series queries.
-- Apply once to a database that already has BlogPost but does not have series.
-- Can also be applied after the C2-I SQL files. Does not modify article content.
-- The transaction rolls back the entire file if any statement fails.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE "BlogSeries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "category" TEXT,
    "goal" TEXT,
    "audience" TEXT,
    "introPostId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BlogSeries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BlogSeriesFeaturedPost" (
    "id" SERIAL NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlogSeriesFeaturedPost_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BlogPost" ADD COLUMN "seriesId" INTEGER;

CREATE UNIQUE INDEX "BlogSeries_name_key" ON "BlogSeries"("name");
CREATE UNIQUE INDEX "BlogSeries_slug_key" ON "BlogSeries"("slug");
CREATE UNIQUE INDEX "BlogSeries_introPostId_key" ON "BlogSeries"("introPostId");
CREATE UNIQUE INDEX "BlogSeriesFeaturedPost_seriesId_postId_key" ON "BlogSeriesFeaturedPost"("seriesId", "postId");
CREATE INDEX "BlogSeriesFeaturedPost_seriesId_position_idx" ON "BlogSeriesFeaturedPost"("seriesId", "position");
CREATE INDEX "BlogPost_seriesId_publishedAt_idx" ON "BlogPost"("seriesId", "publishedAt");

ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "BlogSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BlogSeries" ADD CONSTRAINT "BlogSeries_introPostId_fkey"
    FOREIGN KEY ("introPostId") REFERENCES "BlogPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BlogSeriesFeaturedPost" ADD CONSTRAINT "BlogSeriesFeaturedPost_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "BlogSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlogSeriesFeaturedPost" ADD CONSTRAINT "BlogSeriesFeaturedPost_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
