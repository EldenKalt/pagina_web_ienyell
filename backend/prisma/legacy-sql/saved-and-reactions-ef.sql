-- Apply after annotations-c2.sql and comments-d.sql.
ALTER TABLE "BlogPost" ADD COLUMN "shareCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "SavedBlogPost" (
    "userId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedBlogPost_pkey" PRIMARY KEY ("userId","postId")
);
CREATE INDEX "SavedBlogPost_userId_createdAt_postId_idx" ON "SavedBlogPost"("userId", "createdAt", "postId");
ALTER TABLE "SavedBlogPost" ADD CONSTRAINT "SavedBlogPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedBlogPost" ADD CONSTRAINT "SavedBlogPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BlogPostLike" (
    "userId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlogPostLike_pkey" PRIMARY KEY ("userId","postId")
);
CREATE INDEX "BlogPostLike_postId_idx" ON "BlogPostLike"("postId");
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BlogCommentLike" (
    "userId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlogCommentLike_pkey" PRIMARY KEY ("userId","commentId")
);
CREATE INDEX "BlogCommentLike_commentId_idx" ON "BlogCommentLike"("commentId");
ALTER TABLE "BlogCommentLike" ADD CONSTRAINT "BlogCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlogCommentLike" ADD CONSTRAINT "BlogCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "BlogComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
