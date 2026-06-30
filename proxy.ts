import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// The landing page (/) and the sign-in/up screens are the only routes a
// signed-out visitor may see. Everything else (the /app/* world) is protected.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const onPublic = isPublicRoute(req);

  // Signed-in users skip the landing/auth screens and go straight to their world.
  if (userId && onPublic) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  // Signed-out users hitting a protected route are sent to sign in.
  if (!userId && !onPublic) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
