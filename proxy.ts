import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// /welcome, /sign-in, /sign-up are the only routes a signed-out visitor may see.
const isPublicRoute = createRouteMatcher([
  "/welcome",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const onPublic = isPublicRoute(req);

  // Signed-in users never see the welcome/auth screens.
  if (userId && onPublic) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Signed-out users are sent to the welcome screen.
  if (!userId && !onPublic) {
    return NextResponse.redirect(new URL("/welcome", req.url));
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
