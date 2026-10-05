-- CreateTable
CREATE TABLE "BlogComment" (
    "id" SERIAL NOT NULL,
    "targetId" INTEGER NOT NULL,
    "userId" INTEGER,
    "rootId" INTEGER,
    "parentId" INTEGER,
    "body" TEXT NOT NULL,
    "selector" JSONB,
    "highlight" TEXT,
    "paragraphId" TEXT,
    "paragraphSnapshot" TEXT,
    "isUnassigned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentThreadAssignmentLog" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "fromParagraphId" TEXT,
    "toParagraphId" TEXT,
    "fromUnassigned" BOOLEAN NOT NULL,
    "toUnassigned" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentThreadAssignmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogComment_targetId_rootId_createdAt_id_idx" ON "BlogComment"("targetId", "rootId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "BlogComment_rootId_createdAt_id_idx" ON "BlogComment"("rootId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "BlogComment_targetId_paragraphId_idx" ON "BlogComment"("targetId", "paragraphId");

-- CreateIndex
CREATE INDEX "CommentThreadAssignmentLog_threadId_createdAt_idx" ON "CommentThreadAssignmentLog"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "AnnotationTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "BlogComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BlogComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThreadAssignmentLog" ADD CONSTRAINT "CommentThreadAssignmentLog_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "BlogComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThreadAssignmentLog" ADD CONSTRAINT "CommentThreadAssignmentLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
