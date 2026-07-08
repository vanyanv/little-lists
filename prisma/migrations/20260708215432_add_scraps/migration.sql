-- CreateTable
CREATE TABLE "Scrap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "detection" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scrap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scrap_userId_idx" ON "Scrap"("userId");

-- AddForeignKey
ALTER TABLE "Scrap" ADD CONSTRAINT "Scrap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("clerkUserId") ON DELETE CASCADE ON UPDATE CASCADE;
