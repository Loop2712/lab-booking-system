-- CreateTable
CREATE TABLE "KioskToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "KioskToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KioskToken_token_key" ON "KioskToken"("token");

-- CreateIndex
CREATE INDEX "KioskToken_isActive_idx" ON "KioskToken"("isActive");

-- CreateIndex
CREATE INDEX "KioskToken_revokedAt_idx" ON "KioskToken"("revokedAt");
