import { SignIn, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { SoftDotLoader } from "@/components/soft-dot-loader";

export default function SignInPage() {
  return (
    <div className="text-center">
      <h1 className="font-display text-[clamp(1.6rem,7vw,2rem)] font-semibold leading-tight text-ink">
        Welcome back to your little worlds
      </h1>
      <p className="mt-2 text-[0.98rem] text-brown">Your tiny archive missed you.</p>
      <div className="mt-6 flex justify-center">
        <ClerkLoading>
          <SoftDotLoader label="opening your little worlds" />
        </ClerkLoading>
        <ClerkLoaded>
          <SignIn />
        </ClerkLoaded>
      </div>
    </div>
  );
}
