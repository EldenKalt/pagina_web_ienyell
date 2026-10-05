-- Apply after reader-profile-g.sql and the previous blog SQL files.
ALTER TABLE "User" ADD COLUMN "bio" TEXT,
ADD COLUMN "patreonUrl" TEXT;
