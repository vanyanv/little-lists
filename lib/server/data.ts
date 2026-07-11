import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUserProfile } from "@/lib/server/profile";
import type { List, Person, Profile, Scrap } from "@/lib/types";
import type { Profile as ProfileRow } from "@prisma/client";
import { mapList, mapPerson, mapProfile, mapScrap } from "@/lib/server/serialize";

export interface InitialData {
  lists: List[];
  people: Person[];
  scraps: Scrap[];
  profile: Profile | null;
}

/**
 * Everything the signed-in user's little world is made of, mapped into the
 * UI's shapes and ready to seed the client store. Returns empty collections
 * (and a null profile) when there's no session or the profile row hasn't been
 * created yet — the (app) layout's ensureProfile call normally precedes this.
 */
export async function getInitialData(opts?: { profile?: ProfileRow }): Promise<InitialData> {
  const profile = opts?.profile ?? (await getCurrentUserProfile());
  if (!profile) return { lists: [], people: [], scraps: [], profile: null };

  const userId = profile.clerkUserId;

  const [lists, people, scraps] = await Promise.all([
    prisma.list.findMany({
      where: { userId },
      // pinned worlds float to the top; everything else stays freshest-first
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      include: { items: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.person.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { details: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.scrap.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    lists: lists.map(mapList),
    people: people.map(mapPerson),
    scraps: scraps.map(mapScrap),
    profile: mapProfile(profile),
  };
}
