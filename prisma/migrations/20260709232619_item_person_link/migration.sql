-- AlterTable
ALTER TABLE "ListItem" ADD COLUMN     "personId" TEXT;

-- CreateIndex
CREATE INDEX "ListItem_personId_idx" ON "ListItem"("personId");

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
