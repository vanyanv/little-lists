-- AlterTable
ALTER TABLE "List" DROP COLUMN "visibility";

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "avatarUrl",
DROP COLUMN "bio",
DROP COLUMN "handle";

-- DropEnum
DROP TYPE "Visibility";
