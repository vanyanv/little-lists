// The sample person is "anyone you care about", not one specific friend:
// the landing page cycles through these names (components/landing/cycling-name.tsx)
// and onboarding seeds the demo person with a random one (lib/actions.ts).
// Keep them short and similar in width so the cycling heading never reflows.
export const DEMO_NAMES = ["Maddie", "Sam", "Priya", "Marco", "Yuki", "Amara"] as const;

/** One name at random — for seed-time picks on the server. */
export function pickDemoName(): string {
  return DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
}
