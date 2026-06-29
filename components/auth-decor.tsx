import { Sticker } from "@/components/sticker";

/* Tasteful Little Lists framing for the auth card: soft pastel blobs plus a
   couple of sparkle/sticker badges. Decorative only — aria-hidden. */
export function AuthDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -left-16 -top-10 h-56 w-56 rounded-full bg-blush/40 blur-3xl" />
      <div className="absolute -right-20 top-24 h-64 w-64 rounded-full bg-sky/40 blur-3xl" />
      <div className="absolute bottom-[-4rem] left-1/4 h-60 w-60 rounded-full bg-lavender/35 blur-3xl" />
      <Sticker name="sparkle" size={34} rotate={-8} className="absolute left-8 top-16 opacity-70" />
      <Sticker name="star" size={26} rotate={12} className="absolute right-10 top-12 opacity-60" />
      <Sticker name="heart" size={22} className="absolute bottom-16 right-12 opacity-60" />
      <Sticker name="flower" size={30} rotate={-14} className="absolute bottom-20 left-9 opacity-55" />
    </div>
  );
}
