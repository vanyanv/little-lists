import { SoftDotLoader } from "@/components/soft-dot-loader";

// Shown while the server gathers your little worlds on first load.
export default function AppLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <SoftDotLoader label="gathering your little worlds…" />
    </div>
  );
}
