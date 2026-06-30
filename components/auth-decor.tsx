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
      <Sticker name="sparkle" size={30} rotate={-8} className="absolute left-4 top-5 opacity-70 sm:left-8" />
      <Sticker name="star" size={24} rotate={12} className="absolute right-5 top-4 opacity-60 sm:right-10" />
      <Sticker name="heart" size={22} className="absolute bottom-8 right-6 opacity-60 sm:bottom-16 sm:right-12" />
      <Sticker name="flower" size={28} rotate={-14} className="absolute bottom-10 left-5 opacity-55 sm:bottom-20 sm:left-9" />
    </div>
  );
}
