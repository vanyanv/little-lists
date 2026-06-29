import type { ReactNode } from "react";
import { AuthDecor } from "@/components/auth-decor";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-cream px-5 py-12">
      <AuthDecor />
      <div className="relative z-[1] w-full max-w-[26rem]">{children}</div>
    </div>
  );
}
