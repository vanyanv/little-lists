import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes a signed-out visitor may see. The /app/* world is protected; the
// informational pages (privacy, terms) are open to everyone.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy",
  "/terms",
  "/api/webhooks/clerk",
  // Generated OG/Twitter card images have no file extension in their route
  // path, so the matcher below can't exempt them like it does icon.png —
  // social crawlers hit this signed-out and must not be bounced to sign-in.
  "/opengraph-image(.*)",
  "/twitter-image(.*)",
]);

// The entry screens a signed-in user should skip past, straight to their world.
// (Privacy/terms are public but NOT entry screens, so signed-in users can read them.)
const isAuthEntry = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Signed-in users skip the landing/auth screens and go straight to their world.
  if (userId && isAuthEntry(req)) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  // Signed-out users hitting a protected route are sent to sign in.
  if (!userId && !isPublicRoute(req)) {
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
