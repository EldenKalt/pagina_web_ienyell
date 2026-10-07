-- CreateTable
CREATE TABLE "CommissionRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "referenceFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "CommissionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "terms" BOOLEAN NOT NULL,
    "newsletter" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL DEFAULT '',
    "registeredAt" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionRequest_receivedAt_idx" ON "CommissionRequest"("receivedAt");

-- CreateIndex
CREATE INDEX "CommissionRequest_status_idx" ON "CommissionRequest"("status");

-- CreateIndex
CREATE INDEX "WaitlistEntry_receivedAt_idx" ON "WaitlistEntry"("receivedAt");
