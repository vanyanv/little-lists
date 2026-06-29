import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Idempotently ensure a Profile row exists for the signed-in Clerk user.
 * Returns null when there is no signed-in user. Safe to call on every request:
 * it reads first, and only writes (via upsert, which is race-safe because
 * clerkUserId is unique) when the profile is missing.
 */
export async function ensureProfileForClerkUser(): Promise<Profile | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.profile.findUnique({
    where: { clerkUserId: userId },
  });
  if (existing) return existing;

  const user = await currentUser();
  const displayName =
    user?.firstName?.trim() || user?.username?.trim() || "friend";

  return prisma.profile.upsert({
    where: { clerkUserId: userId },
    update: {},
    create: { clerkUserId: userId, displayName },
  });
}

/** The current Clerk user's Profile, or null. Never writes. */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.profile.findUnique({ where: { clerkUserId: userId } });
}

/**
 * The current user's Profile, or throw. For server actions / route handlers
 * that must have an owning profile. The (app) layout's ensure call means the
 * profile already exists for any request rendered under it.
 */
export async function requireUserProfile(): Promise<Profile> {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("requireUserProfile: no authenticated user profile found");
  }
  return profile;
}
