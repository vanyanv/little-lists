import { SignUp, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { SoftDotLoader } from "@/components/soft-dot-loader";

export default function SignUpPage() {
  return (
    <div className="text-center">
      <h1 className="font-display text-[2rem] font-semibold leading-tight text-ink">
        Let&apos;s make your first little world
      </h1>
      <p className="mt-2 text-[0.98rem] text-brown">Your tiny archive starts here.</p>
      <div className="mt-6 flex justify-center">
        <ClerkLoading>
          <SoftDotLoader label="warming up your world" />
        </ClerkLoading>
        <ClerkLoaded>
          <SignUp />
        </ClerkLoaded>
      </div>
    </div>
  );
}
