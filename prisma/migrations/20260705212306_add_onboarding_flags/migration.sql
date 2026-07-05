-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "checklistDismissed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "demoSeeded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Existing users who already have lists are not first-timers; don't route them
-- through onboarding when the gate ships.
UPDATE "Profile" SET "onboardingCompleted" = true
WHERE "clerkUserId" IN (SELECT DISTINCT "userId" FROM "List");
