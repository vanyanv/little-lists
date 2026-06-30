import { Sticker } from "@/components/sticker";

export function Privacy() {
  return (
    <section className="px-5 py-14">
      <div className="mx-auto max-w-2xl rounded-[var(--radius-2xl)] bg-cream-deep/60 px-6 py-12 text-center ring-1 ring-line/50">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-paper text-3xl shadow-soft">
          🔒
        </span>
        <h2 className="mt-5 font-display font-semibold leading-tight text-ink" style={{ fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}>
          Private by default
        </h2>
        <p className="mx-auto mt-3 max-w-[28rem] text-[1.02rem] leading-relaxed text-brown">
          Your little lists are yours first. Share only what you choose.
        </p>
        <div className="mt-6 flex justify-center gap-3 opacity-70">
          <Sticker name="sparkle" size={22} rotate={-8} />
          <Sticker name="heart" size={20} />
          <Sticker name="star" size={22} rotate={10} />
        </div>
      </div>
    </section>
  );
}
