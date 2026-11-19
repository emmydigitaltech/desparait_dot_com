import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const GUARDED = ["/dashboard", "/listings/new", "/verify", "/onboarding", "/admin"];

// Pages a user with no school must still be able to reach
const SCHOOL_EXEMPT = ["/onboarding", "/login", "/signup", "/auth", "/api", "/terms", "/privacy", "/logout"];

const matches = (path: string, list: string[]) =>
  list.some((p) => path === p || path.startsWith(p + "/"));

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const path = request.nextUrl.pathname;

  // 1. Signed-out users can't open guarded pages
  if (!claims && matches(path, GUARDED)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  // 2. Signed-in users must have a school
  if (claims && request.method === "GET" && !matches(path, SCHOOL_EXEMPT)) {
    const uid = claims.sub as string;
    const known = request.cookies.get("dp_school")?.value === uid;

    if (!known) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", uid)
        .maybeSingle();

      if (profile && !profile.school_id) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        url.search = "";
        const redirect = NextResponse.redirect(url);
        response.cookies.getAll().forEach((c) => redirect.cookies.set(c)); // keep refreshed auth cookies
        return redirect;
      }

      if (profile?.school_id) {
        response.cookies.set("dp_school", uid, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
          secure: process.env.NODE_ENV === "production",
        });
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};