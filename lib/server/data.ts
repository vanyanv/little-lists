import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUserProfile } from "@/lib/server/profile";
import type { List, Person, Profile } from "@/lib/types";
import { mapList, mapPerson, mapProfile } from "@/lib/server/serialize";

export interface InitialData {
  lists: List[];
  people: Person[];
  profile: Profile | null;
}

/**
 * Everything the signed-in user's little world is made of, mapped into the
 * UI's shapes and ready to seed the client store. Returns empty collections
 * (and a null profile) when there's no session or the profile row hasn't been
 * created yet — the (app) layout's ensureProfile call normally precedes this.
 */
export async function getInitialData(): Promise<InitialData> {
  const profile = await getCurrentUserProfile();
  if (!profile) return { lists: [], people: [], profile: null };

  const userId = profile.clerkUserId;

  const [lists, people] = await Promise.all([
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
  ]);

  return {
    lists: lists.map(mapList),
    people: people.map(mapPerson),
    profile: mapProfile(profile),
  };
}
