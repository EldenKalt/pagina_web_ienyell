-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notesEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AnnotationTarget" (
    "id" SERIAL NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,

    CONSTRAINT "AnnotationTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReaderNote" (
    "id" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "selector" JSONB,
    "paragraphId" TEXT,
    "paragraphSnapshot" TEXT,
    "sourceRevision" TEXT,
    "requestKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReaderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReaderHighlight" (
    "id" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "selector" JSONB NOT NULL,
    "selectorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReaderHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnnotationTarget_targetType_targetId_key" ON "AnnotationTarget"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ReaderNote_userId_targetId_createdAt_id_idx" ON "ReaderNote"("userId", "targetId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ReaderNote_targetId_isPublic_createdAt_id_idx" ON "ReaderNote"("targetId", "isPublic", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ReaderNote_userId_requestKey_key" ON "ReaderNote"("userId", "requestKey");

-- CreateIndex
CREATE INDEX "ReaderHighlight_userId_targetId_idx" ON "ReaderHighlight"("userId", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "ReaderHighlight_userId_targetId_selectorKey_key" ON "ReaderHighlight"("userId", "targetId", "selectorKey");

-- AddForeignKey
ALTER TABLE "ReaderNote" ADD CONSTRAINT "ReaderNote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "AnnotationTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaderNote" ADD CONSTRAINT "ReaderNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaderHighlight" ADD CONSTRAINT "ReaderHighlight_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "AnnotationTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaderHighlight" ADD CONSTRAINT "ReaderHighlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
