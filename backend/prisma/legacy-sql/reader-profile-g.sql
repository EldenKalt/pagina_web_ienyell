-- Apply after annotations-c2.sql, comments-d.sql and saved-and-reactions-ef.sql.
ALTER TABLE "User" ADD COLUMN "handle" TEXT,
ADD COLUMN "pronouns" TEXT,
ADD COLUMN "socialLinks" JSONB;

CREATE TABLE "ProfileHandleRedirect" (
    "handle" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileHandleRedirect_pkey" PRIMARY KEY ("handle")
);
CREATE INDEX "ProfileHandleRedirect_userId_idx" ON "ProfileHandleRedirect"("userId");
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
ALTER TABLE "ProfileHandleRedirect" ADD CONSTRAINT "ProfileHandleRedirect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WishlistItem" (
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("userId","productId")
);
CREATE INDEX "WishlistItem_userId_createdAt_productId_idx" ON "WishlistItem"("userId", "createdAt", "productId");
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
