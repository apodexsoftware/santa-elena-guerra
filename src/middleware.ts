import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server"; // NextRequest viene de next/server

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Protege la sesión y refresca el token si es necesario
  const { data: { user } } = await supabase.auth.getUser();

  // Lógica de rutas
  const isDashboardPage = request.nextUrl.pathname.startsWith("/admin/dashboard");
  const isLoginPage = request.nextUrl.pathname === "/login";

  // 1. Si no hay usuario y trata de entrar a /admin -> va a /login
  if (isDashboardPage && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Si hay usuario y trata de entrar a /login -> va a /admin
  if (isLoginPage && user) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - api (rutas de API)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, sitemap, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
